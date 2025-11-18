/**
 * LP 流动性数据服务
 * 优化：将复杂的 LP 计算逻辑独立出来，减少主 handler 的复杂度
 */

import { Database } from '../../db/schema';
import { LpData, LpContractConfig } from './overview.types';
import { createDefaultLpData } from './overview.utils';

/**
 * 获取当前 LP reserves
 * 优化：单一职责，只负责获取当前 reserves
 */
async function getCurrentLpReserves(
  pairContract: any,
  isCatToken0: boolean,
  catDecimals: number,
  usdtDecimals: number
): Promise<{
  currentCatAmount: number;
  currentUsdtAmount: number;
  currentLpValue: number;
}> {
  const currentReserves = await pairContract.getReserves();
  const currentReserve0 = currentReserves[0];
  const currentReserve1 = currentReserves[1];
  
  const currentCatReserve = isCatToken0 ? currentReserve0 : currentReserve1;
  const currentUsdtReserve = isCatToken0 ? currentReserve1 : currentReserve0;
  
  const currentCatAmount = Number(currentCatReserve.toString()) / Math.pow(10, catDecimals);
  const currentUsdtAmount = Number(currentUsdtReserve.toString()) / Math.pow(10, usdtDecimals);
  
  // LP 总价值 = 2 * USDT 数量（因为 LP 池中 CAT 和 USDT 价值相等）
  const currentLpValue = currentUsdtAmount * 2;
  
  return {
    currentCatAmount,
    currentUsdtAmount,
    currentLpValue
  };
}

/**
 * 获取今天0点的区块号
 * 优化：通过时间戳查找0点对应的区块
 */
async function getMidnightBlockNumber(
  provider: any,
  today: string
): Promise<number | null> {
  try {
    // 计算今天0点（北京时间 UTC+8）的时间戳
    const todayDate = new Date(today + 'T00:00:00+08:00');
    const midnightTimestamp = Math.floor(todayDate.getTime() / 1000);
    
    console.log(`🔍 计算0点时间戳: today=${today}, midnightTimestamp=${midnightTimestamp}, date=${new Date(midnightTimestamp * 1000).toISOString()}`);
    
    // 获取当前最新区块
    const latestBlock = await provider.getBlockNumber();
    const latestBlockData = await provider.getBlock(latestBlock);
    
    if (!latestBlockData || !latestBlockData.timestamp) {
      console.warn('❌ 无法获取最新区块数据');
      return null;
    }
    
    console.log(`🔍 最新区块: block=${latestBlock}, timestamp=${latestBlockData.timestamp}, date=${new Date(latestBlockData.timestamp * 1000).toISOString()}`);
    
    // 如果0点时间晚于最新区块时间，说明今天还没到0点
    if (midnightTimestamp > latestBlockData.timestamp) {
      console.warn(`⚠️ 0点时间晚于最新区块时间，今天还没到0点`);
      return null;
    }
    
    // 估算0点区块（假设平均出块时间3秒）
    const estimatedBlockTime = 3;
    const timeDiff = latestBlockData.timestamp - midnightTimestamp;
    const estimatedBlocks = Math.floor(timeDiff / estimatedBlockTime);
    let targetBlock = Math.max(0, latestBlock - estimatedBlocks);
    
    console.log(`🔍 估算0点区块: timeDiff=${timeDiff}, estimatedBlocks=${estimatedBlocks}, targetBlock=${targetBlock}`);
    
    // 二分查找精确的0点区块（缩小范围以提高效率）
    let lowBlock = Math.max(0, targetBlock - 2000);
    let highBlock = Math.min(latestBlock, targetBlock + 2000);
    
    console.log(`🔍 二分查找范围: lowBlock=${lowBlock}, highBlock=${highBlock}`);
    
    // 先快速检查边界
    const lowBlockData = await provider.getBlock(lowBlock);
    const highBlockData = await provider.getBlock(highBlock);
    
    if (lowBlockData && lowBlockData.timestamp && lowBlockData.timestamp >= midnightTimestamp) {
      console.log(`✅ 找到0点区块（下边界）: ${lowBlock}`);
      return lowBlock;
    }
    
    if (highBlockData && highBlockData.timestamp && highBlockData.timestamp < midnightTimestamp) {
      console.warn(`⚠️ 上边界区块时间仍早于0点，扩大搜索范围`);
      // 扩大搜索范围
      highBlock = Math.min(latestBlock, targetBlock + 10000);
    }
    
    while (lowBlock <= highBlock) {
      const midBlock = Math.floor((lowBlock + highBlock) / 2);
      const midBlockData = await provider.getBlock(midBlock);
      
      if (!midBlockData || !midBlockData.timestamp) {
        break;
      }
      
      if (midBlockData.timestamp < midnightTimestamp) {
        lowBlock = midBlock + 1;
      } else {
        highBlock = midBlock - 1;
      }
    }
    
    console.log(`🔍 二分查找完成: lowBlock=${lowBlock}, highBlock=${highBlock}`);
    
    // 找到第一个 >= 0点时间的区块（最多检查100个区块）
    const maxCheck = Math.min(lowBlock + 100, latestBlock);
    for (let block = lowBlock; block <= maxCheck; block++) {
      const blockData = await provider.getBlock(block);
      if (blockData && blockData.timestamp && blockData.timestamp >= midnightTimestamp) {
        console.log(`✅ 找到0点区块: ${block}, timestamp=${blockData.timestamp}, date=${new Date(blockData.timestamp * 1000).toISOString()}`);
        return block;
      }
    }
    
    console.warn(`⚠️ 未找到0点区块，在范围 [${lowBlock}, ${maxCheck}] 内未找到符合条件的区块`);
    return null;
  } catch (error) {
    console.error('❌ 获取0点区块号失败:', error);
    return null;
  }
}

/**
 * 获取 0 点 LP reserves（历史区块查询）
 * 优化：优先使用0点区块，如果没有则使用第一笔交易后的区块
 */
async function getMidnightLpReserves(
  db: Database,
  provider: any,
  lpPairAddress: string,
  today: string,
  isCatToken0: boolean,
  catDecimals: number,
  usdtDecimals: number
): Promise<{
  lpOpenUsd: number | null;
  catAtMidnight: number | null;
  usdtAtMidnight: number | null;
}> {
  let lpOpenUsd: number | null = null;
  let catAtMidnight: number | null = null;
  let usdtAtMidnight: number | null = null;
  
  try {
    // 优先从数据库读取LP快照
    console.log(`🔍 尝试从数据库读取LP快照，日期: ${today}`);
    try {
      const snapshot = await db.getLpSnapshot(today);
      console.log(`🔍 数据库查询结果:`, snapshot ? JSON.stringify(snapshot, null, 2) : 'null');
      if (snapshot && snapshot.lp_value_usd) {
        lpOpenUsd = parseFloat(snapshot.lp_value_usd);
        catAtMidnight = parseFloat(snapshot.cat_amount);
        usdtAtMidnight = parseFloat(snapshot.usdt_amount);
        console.log(`✅ 从数据库读取LP快照成功:`, {
          date: snapshot.date,
          blockNumber: snapshot.block_number,
          lpValue: lpOpenUsd,
          catAmount: catAtMidnight,
          usdtAmount: usdtAtMidnight,
          snapshotType: snapshot.snapshot_type
        });
        return { lpOpenUsd, catAtMidnight, usdtAtMidnight };
      } else {
        console.warn(`⚠️ 数据库查询返回空结果或无效数据`);
      }
    } catch (snapshotError: any) {
      console.error(`❌ 读取LP快照失败:`, snapshotError?.message);
      console.error(`错误堆栈:`, snapshotError?.stack);
    }
    
    console.log(`⚠️ 数据库中没有LP快照，尝试从链上查询...`);
    
    const { ethers } = await import('ethers');
    const pairAbi = [
      'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
    ];
    const pairInterface = new ethers.Interface(pairAbi);
    const getReservesData = pairInterface.encodeFunctionData('getReserves', []);
    
    // 策略：优先使用第一笔交易后的区块（更可靠），如果失败再尝试0点区块
    let targetBlockNumber: number | null = null;
    let blockSource = '未知';
    
    // 先尝试获取第一笔交易
    try {
      console.log(`🔍 开始查询第一笔交易，日期: ${today}`);
      const firstSwap = await db.getFirstSwapOfDay(today);
      console.log(`🔍 第一笔交易查询结果:`, JSON.stringify(firstSwap, null, 2));
      if (firstSwap && firstSwap.block_number) {
        targetBlockNumber = firstSwap.block_number;
        blockSource = '第一笔交易后';
        console.log(`✅ 使用第一笔交易后的区块: ${targetBlockNumber}, block_time=${firstSwap.block_time}, date=${new Date(firstSwap.block_time * 1000).toISOString()}`);
      } else {
        console.warn(`⚠️ 第一笔交易查询返回空结果`);
      }
    } catch (dbError: any) {
      console.error(`❌ 查询第一笔交易失败:`, dbError);
      console.error(`错误堆栈:`, dbError?.stack);
    }
    
    // 如果第一笔交易不存在，尝试查找0点区块
    if (!targetBlockNumber) {
      console.log(`⚠️ 未找到第一笔交易，尝试查找0点区块`);
      targetBlockNumber = await getMidnightBlockNumber(provider, today);
      if (targetBlockNumber) {
        blockSource = '0点区块';
        console.log(`✅ 找到0点区块: ${targetBlockNumber}`);
      }
    }
    
    if (!targetBlockNumber) {
      console.error(`❌ 无法确定目标区块号（既没有第一笔交易，也没有0点区块）`);
      return { lpOpenUsd: null, catAtMidnight: null, usdtAtMidnight: null };
    }
    
    try {
      console.log(`🔍 查询区块 ${targetBlockNumber} 的 LP reserves...`);
      
      // 方法1: 使用 eth_call 查询历史区块
      let openReservesResult: string | null = null;
      try {
        openReservesResult = await provider.send('eth_call', [
          {
            to: lpPairAddress,
            data: getReservesData
          },
          `0x${targetBlockNumber.toString(16)}`
        ]);
        console.log(`🔍 eth_call 查询结果:`, openReservesResult ? '有数据' : '无数据');
      } catch (ethCallError: any) {
        console.warn(`⚠️ eth_call 查询失败，尝试使用合约实例查询:`, ethCallError?.message);
        
        // 方法2: 使用合约实例查询（需要指定区块号）
        try {
          const pairContractAtBlock = new ethers.Contract(
            lpPairAddress,
            pairAbi,
            provider
          );
          const reserves = await pairContractAtBlock.getReserves({ blockTag: targetBlockNumber });
          console.log(`🔍 合约实例查询成功:`, reserves);
          
          // 手动构造返回数据格式
          const reserve0 = reserves[0];
          const reserve1 = reserves[1];
          
          const openCatReserve = isCatToken0 ? reserve0 : reserve1;
          const openUsdtReserve = isCatToken0 ? reserve1 : reserve0;
          
          catAtMidnight = Number(openCatReserve.toString()) / Math.pow(10, catDecimals);
          usdtAtMidnight = Number(openUsdtReserve.toString()) / Math.pow(10, usdtDecimals);
          lpOpenUsd = usdtAtMidnight * 2;
          
          console.log(`✅ 成功获取 ${blockSource} LP 数据（合约实例）:`, {
            blockNumber: targetBlockNumber,
            blockSource,
            catAtMidnight,
            usdtAtMidnight,
            lpOpenUsd
          });
          
          return { lpOpenUsd, catAtMidnight, usdtAtMidnight };
        } catch (contractError: any) {
          console.error(`❌ 合约实例查询也失败:`, contractError?.message);
          throw ethCallError; // 抛出原始错误
        }
      }
      
      if (!openReservesResult || openReservesResult === '0x') {
        console.warn(`⚠️ 获取 LP reserves 返回空结果，区块: ${targetBlockNumber}`);
        return { lpOpenUsd: null, catAtMidnight: null, usdtAtMidnight: null };
      }
      
      const decoded = pairInterface.decodeFunctionResult('getReserves', openReservesResult);
      const openReserve0 = decoded[0];
      const openReserve1 = decoded[1];
      
      console.log(`🔍 解码后的 reserves:`, {
        reserve0: openReserve0.toString(),
        reserve1: openReserve1.toString(),
        isCatToken0
      });
      
      const openCatReserve = isCatToken0 ? openReserve0 : openReserve1;
      const openUsdtReserve = isCatToken0 ? openReserve1 : openReserve0;
      
      catAtMidnight = Number(openCatReserve.toString()) / Math.pow(10, catDecimals);
      usdtAtMidnight = Number(openUsdtReserve.toString()) / Math.pow(10, usdtDecimals);
      lpOpenUsd = usdtAtMidnight * 2;
      
      console.log(`✅ 成功获取 ${blockSource} LP 数据:`, {
        blockNumber: targetBlockNumber,
        blockSource,
        catAtMidnight,
        usdtAtMidnight,
        lpOpenUsd
      });
      
      // 保存到数据库，以便下次直接使用
      try {
        const firstSwap = await db.getFirstSwapOfDay(today);
        const blockTime = firstSwap?.block_time || Math.floor(Date.now() / 1000);
        await db.upsertLpSnapshot({
          date: today,
          block_number: targetBlockNumber,
          block_time: blockTime,
          lp_value_usd: lpOpenUsd.toFixed(2),
          cat_amount: catAtMidnight.toFixed(6),
          usdt_amount: usdtAtMidnight.toFixed(6),
          snapshot_type: blockSource === '0点区块' ? 'midnight' : 'first_swap'
        });
        console.log(`✅ LP快照已保存到数据库`);
      } catch (saveError: any) {
        console.warn(`⚠️ 保存LP快照失败:`, saveError?.message);
      }
    } catch (blockError: any) {
      console.error(`❌ 获取 LP reserves 失败，区块 ${targetBlockNumber}:`, blockError);
      console.error(`错误详情:`, blockError?.message);
    }
  } catch (error) {
    console.warn('❌ 获取 0 点 LP 数据异常:', error);
  }
  
  return { lpOpenUsd, catAtMidnight, usdtAtMidnight };
}

/**
 * 计算 LP 涨跌
 * 优化：单一职责，只负责涨跌计算
 */
function calculateLpChange(
  currentLpValue: number,
  lpOpenUsd: number | null
): { deltaValue: number; changePercent: number } {
  if (lpOpenUsd === null || lpOpenUsd <= 0) {
    console.warn('⚠️ 无法计算 LP 涨跌：缺少 0 点数据');
    return { deltaValue: 0, changePercent: 0 };
  }
  
  const deltaValue = currentLpValue - lpOpenUsd;
  const changePercent = (deltaValue / lpOpenUsd) * 100;
  
  return {
    deltaValue: parseFloat(deltaValue.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2))
  };
}

/**
 * 获取 LP 流动性数据
 * 优化：组合各个子函数，统一错误处理
 */
export async function getLpData(
  db: Database,
  config: LpContractConfig,
  today: string
): Promise<LpData | null> {
  try {
    const { ethers } = await import('ethers');
    const { provider, lpPairAddress, catTokenAddress } = config;
    
    const pairAbi = [
      'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function token0() external view returns (address)',
      'function token1() external view returns (address)'
    ];
    const pairContract = new ethers.Contract(lpPairAddress, pairAbi, provider);
    
    // 确定 token 顺序
    const token0 = (await pairContract.token0()).toLowerCase();
    const token1 = (await pairContract.token1()).toLowerCase();
    const isCatToken0 = token0 === catTokenAddress.toLowerCase();
    
    // 获取 token 精度
    const erc20Abi = ['function decimals() external view returns (uint8)'];
    const token0Contract = new ethers.Contract(token0, erc20Abi, provider);
    const token1Contract = new ethers.Contract(token1, erc20Abi, provider);
    const decimals0 = Number(await token0Contract.decimals());
    const decimals1 = Number(await token1Contract.decimals());
    const catDecimals = isCatToken0 ? decimals0 : decimals1;
    const usdtDecimals = isCatToken0 ? decimals1 : decimals0;
    
    // 并行获取当前和 0 点数据
    const [currentData, midnightData] = await Promise.all([
      getCurrentLpReserves(pairContract, isCatToken0, catDecimals, usdtDecimals),
      getMidnightLpReserves(db, provider, lpPairAddress, today, isCatToken0, catDecimals, usdtDecimals)
    ]);
    
    // 计算涨跌
    const { deltaValue, changePercent } = calculateLpChange(
      currentData.currentLpValue,
      midnightData.lpOpenUsd
    );
    
    const lpData: LpData = {
      currentLpValue: parseFloat(currentData.currentLpValue.toFixed(2)),
      currentCatAmount: parseFloat(currentData.currentCatAmount.toFixed(6)),
      currentUsdtAmount: parseFloat(currentData.currentUsdtAmount.toFixed(6)),
      valueAtMidnight: midnightData.lpOpenUsd !== null && midnightData.lpOpenUsd > 0
        ? parseFloat(midnightData.lpOpenUsd.toFixed(2))
        : null,
      catAtMidnight: midnightData.catAtMidnight !== null
        ? parseFloat(midnightData.catAtMidnight.toFixed(6))
        : null,
      usdtAtMidnight: midnightData.usdtAtMidnight !== null
        ? parseFloat(midnightData.usdtAtMidnight.toFixed(6))
        : null,
      deltaValue,
      changePercent
    };
    
    console.log('✅ LP 数据计算成功:', {
      currentLpValue: lpData.currentLpValue,
      currentCatAmount: lpData.currentCatAmount,
      currentUsdtAmount: lpData.currentUsdtAmount,
      valueAtMidnight: lpData.valueAtMidnight,
      deltaValue: lpData.deltaValue,
      changePercent: lpData.changePercent
    });
    
    return lpData;
  } catch (error) {
    console.error('❌ Error calculating LP liquidity:', error);
    return null;
  }
}


/**
 * Address Stats Calculator
 * 优化：将复杂逻辑拆分为多个模块，提高可维护性和可测试性
 */
import { Database } from './db/schema';
import { SwapRecord, AddressStats, CalculationState } from './addressStats.types';
import {
  createInitialState,
  buildAddressStats
} from './addressStats.utils';
import {
  processBuy,
  processSell,
  endRound,
  updateTimeInfo
} from './addressStats.processors';

export class AddressStatsCalculator {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 计算单个地址的统计信息
   * 优化：使用模块化的处理器和工具函数，简化主逻辑
   */
  async calculateAddressStats(address: string, latestPrice: string | null = null): Promise<AddressStats | null> {
    // 获取地址的所有 Swap 记录
    const swaps = await this.db.getAddressSwaps(address);
    
    if (swaps.length === 0) {
      return null;
    }

    // 如果没有提供最新价格，从数据库获取
    if (!latestPrice) {
      latestPrice = await this.db.getLatestPrice();
    }

    // 初始化计算状态
    const state = createInitialState();

    // 按时间顺序处理每笔交易
    for (const swap of swaps) {
      // 更新时间信息
      updateTimeInfo(swap, state);

      if (swap.side === 'buy') {
        processBuy(swap, state);
      } else if (swap.side === 'sell') {
        processSell(swap, state);

        // 检查是否结束当前轮回（持仓归零）
        if (state.positionCat === 0n) {
          await endRound(address, swap, state, this.db);
        }
      }
    }

    // 获取最近7天的统计
    const last7DStats = await this.db.getAddressLast7DStats(address);

    // 构建统计对象
    const stats = buildAddressStats(address, state, latestPrice, last7DStats);

    // 保存到数据库（需要转换 boolean 为 number）
    await this.db.upsertAddressStats({
      ...stats,
      is_new_address: stats.is_new_address ? 1 : 0,
      is_swing_trader: stats.is_swing_trader ? 1 : 0,
      is_profitable_realized: stats.is_profitable_realized ? 1 : 0,
      is_profitable_total: stats.is_profitable_total ? 1 : 0,
      is_deep_loss: stats.is_deep_loss ? 1 : 0,
      avg_buy_price: stats.avg_buy_price || null,
      roi_total: stats.roi_total || null,
      first_trade_at: stats.first_trade_at || null,
      last_trade_at: stats.last_trade_at || null
    });

    return stats;
  }

  /**
   * 批量计算所有地址的统计信息
   */
  async calculateAllAddresses(batchSize: number = 10): Promise<void> {
    console.log('Starting batch calculation for all addresses...');
    
    const addresses = await this.db.getAllTradingAddresses();
    console.log(`Found ${addresses.length} addresses to calculate`);

    const latestPrice = await this.db.getLatestPrice();

    let processed = 0;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (address) => {
          try {
            await this.calculateAddressStats(address, latestPrice);
            processed++;
            if (processed % 10 === 0) {
              console.log(`Processed ${processed}/${addresses.length} addresses`);
            }
          } catch (error) {
            console.error(`Error calculating stats for ${address}:`, error);
          }
        })
      );
    }

    console.log(`Batch calculation completed. Processed ${processed} addresses`);
  }

  /**
   * 计算单个地址的统计（如果不存在则计算，存在则更新）
   */
  async calculateOrUpdateAddress(address: string): Promise<AddressStats | null> {
    const latestPrice = await this.db.getLatestPrice();
    return await this.calculateAddressStats(address, latestPrice);
  }
}


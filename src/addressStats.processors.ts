/**
 * Address Stats 处理器
 * 优化：将买入、卖出、轮回管理等处理逻辑独立出来
 */

import { SwapRecord, CalculationState } from './addressStats.types';
import { Database } from './db/schema';

/**
 * 处理买入交易
 * 优化：单一职责，只负责买入逻辑处理
 */
export function processBuy(
  swap: SwapRecord,
  state: CalculationState
): void {
  const amountCat = BigInt(Math.floor(parseFloat(swap.amount_cat)));
  const amountUsd = swap.amount_usd ? parseFloat(swap.amount_usd) : 0;

  state.buyCount++;
  state.buyVolumeCat += amountCat;
  state.buyVolumeUsd += amountUsd;

  // 检查是否开启新轮回（从 0 变为 >0）
  if (state.positionCat === 0n && state.currentRoundStartTime === null) {
    state.roundIndex++;
    state.currentRoundStartTime = swap.block_time;
    state.currentRoundPnlUsd = 0;
    state.currentRoundBuyVolumeCat = 0n;
    state.currentRoundBuyVolumeUsd = 0;
    state.currentRoundSellVolumeCat = 0n;
    state.currentRoundSellVolumeUsd = 0;
  }

  // 买入逻辑：增加仓位和成本
  state.positionCat += amountCat;
  state.costUsd += amountUsd;

  // 更新当前轮回数据
  if (state.currentRoundStartTime !== null) {
    state.currentRoundBuyVolumeCat += amountCat;
    state.currentRoundBuyVolumeUsd += amountUsd;
  }
}

/**
 * 处理卖出交易
 * 优化：单一职责，只负责卖出逻辑处理
 */
export function processSell(
  swap: SwapRecord,
  state: CalculationState
): void {
  const amountCat = BigInt(Math.floor(parseFloat(swap.amount_cat)));
  const amountUsd = swap.amount_usd ? parseFloat(swap.amount_usd) : 0;

  state.sellCount++;
  state.sellVolumeCat += amountCat;
  state.sellVolumeUsd += amountUsd;

  if (state.positionCat === 0n || state.costUsd === 0) {
    // 没有持仓，跳过（可能是数据问题）
    return;
  }

  // 计算平均成本价（需要先转换为浮点数）
  const positionCatNum = Number(state.positionCat);
  if (positionCatNum === 0) {
    return; // 避免除零
  }
  const avgBuyPrice = state.costUsd / positionCatNum;
  
  // 卖出数量（转换为浮点数）
  const sellQty = Number(amountCat);
  const sellValue = amountUsd;

  // 这部分对应的成本（按比例计算）
  const costForThisSell = avgBuyPrice * sellQty;

  // 计算这次卖出的盈亏
  const realizedPnlForThisSell = sellValue - costForThisSell;
  state.realizedPnlUsd += realizedPnlForThisSell;
  state.currentRoundPnlUsd += realizedPnlForThisSell;

  // 更新持仓和成本
  state.positionCat -= amountCat;
  state.costUsd = Math.max(0, state.costUsd - costForThisSell); // 确保成本不为负

  // 更新当前轮回数据
  if (state.currentRoundStartTime !== null) {
    state.currentRoundSellVolumeCat += amountCat;
    state.currentRoundSellVolumeUsd += amountUsd;
  }
}

/**
 * 结束当前轮回（持仓归零时）
 * 优化：单一职责，只负责轮回结束逻辑
 */
export async function endRound(
  address: string,
  swap: SwapRecord,
  state: CalculationState,
  db: Database
): Promise<void> {
  if (state.currentRoundStartTime === null) {
    return;
  }

  const resultType: 'profit' | 'loss' | null = 
    state.currentRoundPnlUsd > 0 ? 'profit' : 
    state.currentRoundPnlUsd < 0 ? 'loss' : null;

  if (resultType === 'profit') {
    state.profitRoundCount++;
  } else if (resultType === 'loss') {
    state.lossRoundCount++;
  }

  // 保存轮回记录
  await db.insertAddressRound({
    address,
    round_index: state.roundIndex,
    start_time: state.currentRoundStartTime,
    end_time: swap.block_time,
    buy_volume_cat: state.currentRoundBuyVolumeCat.toString(),
    buy_volume_usd: state.currentRoundBuyVolumeUsd.toFixed(6),
    sell_volume_cat: state.currentRoundSellVolumeCat.toString(),
    sell_volume_usd: state.currentRoundSellVolumeUsd.toFixed(6),
    realized_pnl_usd: state.currentRoundPnlUsd.toFixed(6),
    result_type: resultType
  });

  // 重置轮回数据
  state.currentRoundStartTime = null;
  state.currentRoundPnlUsd = 0;
  state.currentRoundBuyVolumeCat = 0n;
  state.currentRoundBuyVolumeUsd = 0;
  state.currentRoundSellVolumeCat = 0n;
  state.currentRoundSellVolumeUsd = 0;
  
  // 确保成本也为 0
  state.costUsd = 0;
}

/**
 * 更新时间信息
 * 优化：单一职责，只负责时间信息更新
 */
export function updateTimeInfo(
  swap: SwapRecord,
  state: CalculationState
): void {
  if (!state.firstTradeAt) {
    state.firstTradeAt = swap.block_time;
  }
  state.lastTradeAt = swap.block_time;
  state.tradeCount++;
}


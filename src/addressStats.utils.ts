/**
 * Address Stats 相关工具函数
 * 优化：提取可复用的计算逻辑，避免在主类中重复代码
 */

import { AddressStats, CalculationState } from './addressStats.types';

/**
 * 计算平均买入价
 * 优化：单一职责，只负责平均买入价计算
 */
export function calculateAvgBuyPrice(
  positionCat: bigint,
  costUsd: number
): string | null {
  if (positionCat > 0n && costUsd > 0) {
    return (costUsd / Number(positionCat)).toFixed(8);
  }
  return null;
}

/**
 * 计算浮盈浮亏
 * 优化：单一职责，只负责浮盈浮亏计算
 */
export function calculateUnrealizedPnl(
  positionCat: bigint,
  costUsd: number,
  latestPrice: string | null
): number {
  if (positionCat > 0n && latestPrice) {
    const currentPrice = parseFloat(latestPrice);
    const currentPositionValue = Number(positionCat) * currentPrice;
    return currentPositionValue - costUsd;
  }
  return 0;
}

/**
 * 计算 ROI
 * 优化：单一职责，只负责 ROI 计算
 */
export function calculateROI(
  totalPnlUsd: number,
  buyVolumeUsd: number
): string | null {
  if (buyVolumeUsd > 0) {
    return ((totalPnlUsd / buyVolumeUsd) * 100).toFixed(4);
  }
  return null;
}

/**
 * 计算地址标签
 * 优化：单一职责，只负责标签计算
 */
export function calculateAddressLabels(
  state: CalculationState,
  totalPnlUsd: number
): {
  isNewAddress: boolean;
  isSwingTrader: boolean;
  isProfitableRealized: boolean;
  isProfitableTotal: boolean;
  isDeepLoss: boolean;
} {
  const now = Math.floor(Date.now() / 1000);
  const day7Ago = now - 7 * 24 * 60 * 60;
  
  // 新地址：首次交易在最近7天内
  const isNewAddress = state.firstTradeAt ? (state.firstTradeAt >= day7Ago) : false;
  
  // 波段交易者：交易次数>=3，且有买有卖，总交易量>=100 CAT
  const totalVolumeCat = Number(state.buyVolumeCat) + Number(state.sellVolumeCat);
  const isSwingTrader = state.tradeCount >= 3 && 
                        state.buyCount >= 1 && 
                        state.sellCount >= 1 &&
                        totalVolumeCat >= 100;
  
  // 盈利地址
  const isProfitableRealized = state.realizedPnlUsd > 0;
  const isProfitableTotal = totalPnlUsd > 0;
  
  // 深度浮亏
  const isDeepLoss = totalPnlUsd < 0 && state.positionCat > 0n;
  
  return {
    isNewAddress,
    isSwingTrader,
    isProfitableRealized,
    isProfitableTotal,
    isDeepLoss
  };
}

/**
 * 构建地址统计对象
 * 优化：单一职责，只负责对象构建
 */
export function buildAddressStats(
  address: string,
  state: CalculationState,
  latestPrice: string | null,
  last7DStats: { volume_usd: string; trades: number }
): AddressStats {
  const avgBuyPrice = calculateAvgBuyPrice(state.positionCat, state.costUsd);
  const unrealizedPnlUsd = calculateUnrealizedPnl(state.positionCat, state.costUsd, latestPrice);
  const totalPnlUsd = state.realizedPnlUsd + unrealizedPnlUsd;
  const roiTotal = calculateROI(totalPnlUsd, state.buyVolumeUsd);
  
  // 计算标签
  const labels = calculateAddressLabels(state, totalPnlUsd);
  
  
  return {
    address,
    trade_count: state.tradeCount,
    buy_count: state.buyCount,
    sell_count: state.sellCount,
    buy_volume_cat: state.buyVolumeCat.toString(),
    sell_volume_cat: state.sellVolumeCat.toString(),
    buy_volume_usd: state.buyVolumeUsd.toFixed(6),
    sell_volume_usd: state.sellVolumeUsd.toFixed(6),
    current_position_cat: state.positionCat.toString(),
    current_cost_usd: state.costUsd.toFixed(6),
    avg_buy_price: avgBuyPrice,
    realized_pnl_usd: state.realizedPnlUsd.toFixed(6),
    unrealized_pnl_usd: unrealizedPnlUsd.toFixed(6),
    total_pnl_usd: totalPnlUsd.toFixed(6),
    roi_total: roiTotal,
    profit_round_count: state.profitRoundCount,
    loss_round_count: state.lossRoundCount,
    current_round_pnl_usd: state.currentRoundPnlUsd.toFixed(6),
    first_trade_at: state.firstTradeAt,
    last_trade_at: state.lastTradeAt,
    is_new_address: labels.isNewAddress,
    is_swing_trader: labels.isSwingTrader,
    is_profitable_realized: labels.isProfitableRealized,
    is_profitable_total: labels.isProfitableTotal,
    is_deep_loss: labels.isDeepLoss,
    last_7d_volume_usd: last7DStats.volume_usd,
    last_7d_trades: last7DStats.trades
  };
}

/**
 * 初始化计算状态
 * 优化：单一职责，只负责状态初始化
 */
export function createInitialState(): CalculationState {
  return {
    positionCat: 0n,
    costUsd: 0,
    realizedPnlUsd: 0,
    currentRoundPnlUsd: 0,
    roundIndex: 0,
    profitRoundCount: 0,
    lossRoundCount: 0,
    tradeCount: 0,
    buyCount: 0,
    sellCount: 0,
    buyVolumeCat: 0n,
    sellVolumeCat: 0n,
    buyVolumeUsd: 0,
    sellVolumeUsd: 0,
    firstTradeAt: null,
    lastTradeAt: null,
    currentRoundStartTime: null,
    currentRoundBuyVolumeCat: 0n,
    currentRoundBuyVolumeUsd: 0,
    currentRoundSellVolumeCat: 0n,
    currentRoundSellVolumeUsd: 0
  };
}


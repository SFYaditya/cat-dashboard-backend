/**
 * Address Stats 相关类型定义
 */

/**
 * Swap 记录
 */
export interface SwapRecord {
  id: number;
  block_number: number;
  block_time: number;
  tx_hash: string;
  log_index: number;
  trader_address: string;
  side: 'buy' | 'sell';
  amount_cat: string;
  amount_usd: string | null;
  price_usd: string | null;
}

/**
 * 地址统计信息
 */
export interface AddressStats {
  address: string;
  trade_count: number;
  buy_count: number;
  sell_count: number;
  buy_volume_cat: string;
  sell_volume_cat: string;
  buy_volume_usd: string;
  sell_volume_usd: string;
  current_position_cat: string;
  current_cost_usd: string;
  avg_buy_price: string | null;
  realized_pnl_usd: string;
  unrealized_pnl_usd: string;
  total_pnl_usd: string;
  roi_total: string | null;
  profit_round_count: number;
  loss_round_count: number;
  current_round_pnl_usd: string;
  first_trade_at: number | null;
  last_trade_at: number | null;
  is_new_address: boolean;
  is_swing_trader: boolean;
  is_profitable_realized: boolean;
  is_profitable_total: boolean;
  is_deep_loss: boolean;
  last_7d_volume_usd: string;
  last_7d_trades: number;
}

/**
 * 轮回数据
 */
export interface RoundData {
  round_index: number;
  start_time: number;
  end_time: number | null;
  buy_volume_cat: string;
  buy_volume_usd: string;
  sell_volume_cat: string;
  sell_volume_usd: string;
  realized_pnl_usd: string;
  result_type: 'profit' | 'loss' | null;
}

/**
 * 计算状态（用于跟踪计算过程中的状态）
 */
export interface CalculationState {
  // 持仓和成本
  positionCat: bigint;
  costUsd: number;
  realizedPnlUsd: number;
  currentRoundPnlUsd: number;
  roundIndex: number;
  profitRoundCount: number;
  lossRoundCount: number;
  
  // 交易统计
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  buyVolumeCat: bigint;
  sellVolumeCat: bigint;
  buyVolumeUsd: number;
  sellVolumeUsd: number;
  
  // 时间信息
  firstTradeAt: number | null;
  lastTradeAt: number | null;
  
  // 当前轮回数据
  currentRoundStartTime: number | null;
  currentRoundBuyVolumeCat: bigint;
  currentRoundBuyVolumeUsd: number;
  currentRoundSellVolumeCat: bigint;
  currentRoundSellVolumeUsd: number;
}


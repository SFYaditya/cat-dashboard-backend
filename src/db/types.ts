/**
 * 数据库类型定义
 * 集中管理所有数据库相关的类型
 */

// Sync State 类型
export interface SyncState {
  last_block: number;
  start_block?: number;
}

// Transfer 相关类型
export interface TransferData {
  block_number: number;
  block_time: number;
  tx_hash: string;
  log_index: number;
  from_address: string;
  to_address: string;
  amount_cat: string;
  is_swap_related: boolean;
}

// Swap 相关类型
export interface SwapData {
  block_number: number;
  block_time: number;
  tx_hash: string;
  log_index: number;
  trader_address: string;
  side: 'buy' | 'sell' | null;
  amount_cat: string;
  amount_usd: string | null;
  price_usd: string | null;
  pair_address: string;
}

export interface SwapUpdateData {
  tx_hash: string;
  log_index: number;
  side: 'buy' | 'sell';
  amount_cat: string;
  amount_usd: string;
  price_usd: string;
  is_large: boolean;
  is_whale: boolean;
}

// Holder 相关类型
export interface HolderData {
  address: string;
  balance_cat: string;
}

// Address Stats 相关类型
export interface AddressStatsData {
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
  is_new_address: number;
  is_swing_trader: number;
  is_profitable_realized: number;
  is_profitable_total: number;
  is_deep_loss: number;
  last_7d_volume_usd: string;
  last_7d_trades: number;
}

// Address Round 相关类型
export interface AddressRoundData {
  address: string;
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

// Kline 相关类型
export interface KlineData {
  interval: string;
  open_time: number;
  open_price: string;
  high_price: string;
  low_price: string;
  close_price: string;
  volume_cat: string;
  volume_usd: string;
}

export interface KlineQueryParams {
  interval: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

// Daily Metrics 相关类型
export interface DailyMetricsData {
  day: string;
  open_price: string;
  close_price: string;
  high_price: string;
  low_price: string;
  swaps_count: number;
  volume_cat: string;
  volume_usd: string;
  unique_traders: number;
  holders_count: number;
}

// Daily Trade Stats 相关类型
export interface DailyTradeStatsData {
  date: string;
  buy_address_count: number;
  sell_address_count: number;
  total_buy_cat: string;
  total_sell_cat: string;
  buy_tx_count: number;
  sell_tx_count: number;
  net_flow_cat: string;
  unique_trader_count: number;
}

// PnL Daily 相关类型
export interface PnlDailyData {
  address: string;
  date: string;
  buy_cat: string;
  buy_usd: string;
  sell_cat: string;
  sell_usd: string;
  realized_pnl_usd: string;
  fees_usd: string;
}

// Swaps Filter 参数类型
export interface SwapsFilterParams {
  limit?: number;
  offset?: number;
  side?: 'buy' | 'sell' | 'all';
  minAmountUsd?: number;
  maxAmountUsd?: number;
  onlyLarge?: boolean;
  onlyWhale?: boolean;
  address?: string;
  filterNewAddress?: boolean;
  filterSwingTrader?: boolean;
  filterProfitable?: boolean;
  filterDeepLoss?: boolean;
  startTime?: number;
  endTime?: number;
}

// Transfers Filter 参数类型
export interface TransfersFilterParams {
  limit?: number;
  offset?: number;
  address?: string;
  direction?: 'all' | 'in' | 'out';
  minAmount?: number;
  startTime?: number;
  endTime?: number;
  excludeSwapRelated?: boolean;
}

// Transfer Summary 类型
export interface TransferSummary {
  totalOutCount: number;
  totalOutAmount: string;
  totalInCount: number;
  totalInAmount: string;
}

// Transfer Graph 类型
export interface TransferGraphNode {
  address: string;
  total_in_cat?: string;
  total_out_cat?: string;
  tx_count: number;
  is_contract: boolean;
  label: string | null;
}

export interface TransferGraph {
  center: string;
  upstream: TransferGraphNode[];
  downstream: TransferGraphNode[];
}

// Daily Transfer Summary 类型
export interface DailyTransferSummary {
  date: string;
  stake_total_cat: string;
  unstake_total_cat: string;
  normal_total_cat: string;
}


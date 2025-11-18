/**
 * Overview 相关类型定义
 */

/**
 * 价格数据
 */
export interface PriceData {
  price_now: number;
  price_open_today: number;
  change_percent: number;
  change_value: number;
}

/**
 * LP 流动性数据
 */
export interface LpData {
  currentLpValue: number;
  currentCatAmount: number;
  currentUsdtAmount: number;
  valueAtMidnight: number | null;
  catAtMidnight: number | null;
  usdtAtMidnight: number | null;
  deltaValue: number;
  changePercent: number;
}

/**
 * 持币人数数据
 */
export interface HoldersData {
  currentHolders: number;
  openHolders: number;
  changeAbs: number;
  changePct: number;
}

/**
 * 快速概览数据
 */
export interface OverviewData {
  latest_price: string;
  price_change_24h: string;
  volume_24h_usd: string;
  swaps_24h: number;
  holders_count: number;
  unique_traders_24h: number;
}

/**
 * 市场概览数据
 */
export interface MarketOverviewData {
  day: string;
  lastUpdated: string;
  price: PriceData;
  lp: LpData;
  holders: HoldersData;
}

/**
 * LP 合约配置
 */
export interface LpContractConfig {
  provider: any;
  lpPairAddress: string;
  catTokenAddress: string;
}


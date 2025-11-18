/**
 * Daily Metrics 和 Daily Trade Stats 相关查询
 * 优化：重新导出所有模块化的查询函数，保持向后兼容
 */
// Daily Metrics 相关
export {
  upsertDailyMetrics,
  getDailyMetrics,
  getUniqueTradersForDay
} from './daily.metrics.queries';

// Daily Trade Stats 相关
export {
  upsertDailyTradeStats,
  getDailyTradeStats,
  hasDailyTradeStats,
  incrementDailyTradeStats
} from './daily.trade-stats.queries';

// Swap 相关
export {
  getSwapsByTimeRange,
  getSwapsAfterId,
  getLastProcessedSwapId
} from './daily.swaps.queries';
export type { SwapRecord } from './daily.swaps.queries';

// 价格相关
export {
  getOpenPrice,
  getFirstSwapOfDay,
  getPrice24HAgo
} from './daily.price.queries';

// 统计相关
export {
  get24HStats
} from './daily.stats.queries';
export type { Stats24H } from './daily.stats.queries';

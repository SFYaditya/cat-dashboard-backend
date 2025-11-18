/**
 * Daily 查询相关工具函数
 * 优化：提取可复用的工具函数，避免重复代码
 */

/**
 * 生成日期范围内的所有日期
 * 优化：单一职责，只负责日期生成
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  let current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 创建默认的每日交易统计数据
 * 优化：避免重复创建默认对象
 */
export function createDefaultDailyTradeStats(date: string) {
  return {
    date,
    buy_address_count: 0,
    sell_address_count: 0,
    total_buy_cat: '0',
    total_sell_cat: '0',
    buy_tx_count: 0,
    sell_tx_count: 0,
    net_flow_cat: '0',
    unique_trader_count: 0
  };
}

/**
 * 计算日期的时间戳范围（北京时间 UTC+8）
 * 优化：统一时间戳计算逻辑
 */
export function getDayTimeRange(day: string): { startTime: number; endTime: number } {
  const startTime = Math.floor(new Date(day + 'T00:00:00+08:00').getTime() / 1000);
  const endTime = Math.floor(new Date(day + 'T23:59:59+08:00').getTime() / 1000);
  return { startTime, endTime };
}


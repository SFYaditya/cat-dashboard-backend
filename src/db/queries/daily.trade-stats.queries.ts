/**
 * Daily Trade Stats 相关查询
 * 优化：将 Daily Trade Stats 相关查询独立成模块
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { DailyTradeStatsData } from '../types';
import { generateDateRange, createDefaultDailyTradeStats } from './daily.utils';

/**
 * 插入或更新每日交易统计
 * 优化：单一职责，只负责 Daily Trade Stats 的插入/更新
 */
export async function upsertDailyTradeStats(
  db: sqlite3.Database,
  date: string,
  data: DailyTradeStatsData
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR REPLACE INTO cat_daily_trade_stats 
     (date, buy_address_count, sell_address_count, total_buy_cat, total_sell_cat, 
      buy_tx_count, sell_tx_count, net_flow_cat, unique_trader_count, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
    [
      date,
      data.buy_address_count,
      data.sell_address_count,
      data.total_buy_cat,
      data.total_sell_cat,
      data.buy_tx_count,
      data.sell_tx_count,
      data.net_flow_cat,
      data.unique_trader_count
    ]
  );
}

/**
 * 获取每日交易统计（按日期区间）
 * 优化：简化查询逻辑，使用工具函数
 */
export async function getDailyTradeStats(
  db: sqlite3.Database,
  startDate?: string,
  endDate?: string
): Promise<Array<DailyTradeStatsData>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  if (!startDate && !endDate) {
    const sql = `SELECT date, buy_address_count, sell_address_count, total_buy_cat, total_sell_cat, 
                        buy_tx_count, sell_tx_count, net_flow_cat, unique_trader_count
                 FROM cat_daily_trade_stats
                 ORDER BY date ASC`;
    return await all(sql) as Array<DailyTradeStatsData>;
  }

  if (startDate && endDate) {
    // 生成日期范围内的所有日期
    const dates = generateDateRange(startDate, endDate);

    // 查询数据库中的实际数据
    const sql = `SELECT date, buy_address_count, sell_address_count, total_buy_cat, total_sell_cat, 
                        buy_tx_count, sell_tx_count, net_flow_cat, unique_trader_count
                 FROM cat_daily_trade_stats
                 WHERE date >= ? AND date <= ?
                 ORDER BY date ASC`;
    const dbData = await all(sql, [startDate, endDate]) as Array<DailyTradeStatsData>;

    // 创建日期到数据的映射（优化：使用 Map 提高查找性能）
    const dataMap = new Map<string, DailyTradeStatsData>();
    for (const item of dbData) {
      dataMap.set(item.date, item);
    }

    // 为每个日期生成数据，如果没有则使用默认值
    return dates.map(date => {
      const existing = dataMap.get(date);
      return existing || createDefaultDailyTradeStats(date);
    });
  }

  // 只指定了 startDate 或 endDate 的情况
  let sql = `SELECT date, buy_address_count, sell_address_count, total_buy_cat, total_sell_cat, 
                    buy_tx_count, sell_tx_count, net_flow_cat, unique_trader_count
             FROM cat_daily_trade_stats`;
  const params: any[] = [];
  const conditions: string[] = [];

  if (startDate) {
    conditions.push('date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('date <= ?');
    params.push(endDate);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` ORDER BY date ASC`;

  return await all(sql, params) as Array<DailyTradeStatsData>;
}

/**
 * 检查每日交易统计是否存在
 * 优化：单一职责，只负责存在性检查
 */
export async function hasDailyTradeStats(
  db: sqlite3.Database,
  date: string
): Promise<boolean> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    'SELECT 1 FROM cat_daily_trade_stats WHERE date = ?',
    [date]
  );
  return !!result;
}

/**
 * 实时增量更新当天的交易统计
 * 优化：简化更新逻辑，提取重复的 SQL 部分
 */
export async function incrementDailyTradeStats(
  db: sqlite3.Database,
  dateStr: string,
  traderAddress: string,
  side: 'buy' | 'sell',
  amountCat: string
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;

  try {
    // 检查当天记录是否存在
    const existing = await get(
      `SELECT * FROM cat_daily_trade_stats WHERE date = ?`,
      [dateStr]
    );

    if (!existing) {
      // 如果不存在，创建一条初始记录
      await run(
        `INSERT INTO cat_daily_trade_stats 
         (date, buy_address_count, sell_address_count, total_buy_cat, total_sell_cat, 
          buy_tx_count, sell_tx_count, net_flow_cat, unique_trader_count, updated_at)
         VALUES (?, 0, 0, '0', '0', 0, 0, '0', 0, strftime('%s', 'now'))`,
        [dateStr]
      );
    }

    // 检查该地址在今天是否已经有同方向的交易
    const todaySwaps = await all(
      `SELECT DISTINCT trader_address, side 
       FROM cat_swaps 
       WHERE date(datetime(block_time, 'unixepoch', '+8 hours')) = ? 
         AND trader_address = ? 
         AND side IS NOT NULL`,
      [dateStr, traderAddress.toLowerCase()]
    ) as Array<{ trader_address: string; side: string }>;

    const hasBuyToday = todaySwaps.some(s => s.side === 'buy');
    const hasSellToday = todaySwaps.some(s => s.side === 'sell');

    // 计算增量
    const amountCatNum = parseFloat(amountCat);
    const isNewAddressForSide = side === 'buy' ? !hasBuyToday : !hasSellToday;

    // 优化：提取公共的 unique_trader_count 子查询
    const uniqueTraderCountSubquery = `(
      SELECT COUNT(DISTINCT trader_address) 
      FROM cat_swaps 
      WHERE date(datetime(block_time, 'unixepoch', '+8 hours')) = ? 
        AND side IS NOT NULL
    )`;

    // 更新统计
    if (side === 'buy') {
      await run(
        `UPDATE cat_daily_trade_stats 
         SET buy_tx_count = buy_tx_count + 1,
             total_buy_cat = CAST(total_buy_cat AS REAL) + ?,
             net_flow_cat = CAST(net_flow_cat AS REAL) + ?,
             buy_address_count = buy_address_count + ?,
             unique_trader_count = ${uniqueTraderCountSubquery},
             updated_at = strftime('%s', 'now')
         WHERE date = ?`,
        [amountCatNum, amountCatNum, isNewAddressForSide ? 1 : 0, dateStr, dateStr]
      );
    } else {
      await run(
        `UPDATE cat_daily_trade_stats 
         SET sell_tx_count = sell_tx_count + 1,
             total_sell_cat = CAST(total_sell_cat AS REAL) + ?,
             net_flow_cat = CAST(net_flow_cat AS REAL) - ?,
             sell_address_count = sell_address_count + ?,
             unique_trader_count = ${uniqueTraderCountSubquery},
             updated_at = strftime('%s', 'now')
         WHERE date = ?`,
        [amountCatNum, amountCatNum, isNewAddressForSide ? 1 : 0, dateStr, dateStr]
      );
    }
  } catch (error) {
    console.error('Error incrementing daily trade stats:', error);
    // 不抛出错误，避免影响主流程
  }
}


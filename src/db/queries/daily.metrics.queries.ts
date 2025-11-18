/**
 * Daily Metrics 相关查询
 * 优化：将 Daily Metrics 相关查询独立成模块
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { DailyMetricsData } from '../types';

/**
 * 插入或更新每日指标
 * 优化：单一职责，只负责 Daily Metrics 的插入/更新
 */
export async function upsertDailyMetrics(
  db: sqlite3.Database,
  data: DailyMetricsData
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR REPLACE INTO cat_daily_metrics 
     (day, open_price, close_price, high_price, low_price, swaps_count, 
      volume_cat, volume_usd, unique_traders, holders_count, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
    [
      data.day,
      data.open_price,
      data.close_price,
      data.high_price,
      data.low_price,
      data.swaps_count,
      data.volume_cat,
      data.volume_usd,
      data.unique_traders,
      data.holders_count
    ]
  );
}

/**
 * 获取每日指标
 * 优化：简化查询构建逻辑
 */
export async function getDailyMetrics(
  db: sqlite3.Database,
  startDay?: string,
  endDay?: string
): Promise<any[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  let query = `SELECT * FROM cat_daily_metrics WHERE 1=1`;
  const args: any[] = [];

  if (startDay) {
    query += ` AND day >= ?`;
    args.push(startDay);
  }
  if (endDay) {
    query += ` AND day <= ?`;
    args.push(endDay);
  }

  query += ` ORDER BY day ASC`;

  return await all(query, args) as any[];
}

/**
 * 获取指定日期的唯一交易地址数
 * 优化：单一职责，只负责唯一交易地址数查询
 */
export async function getUniqueTradersForDay(
  db: sqlite3.Database,
  dayStart: number,
  dayEnd: number
): Promise<number> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const results = await all(
    `SELECT COUNT(DISTINCT trader_address) as count 
     FROM cat_swaps 
     WHERE block_time >= ? AND block_time < ?`,
    [dayStart, dayEnd]
  ) as { count: number }[];
  return results[0]?.count || 0;
}


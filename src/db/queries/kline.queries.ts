/**
 * K线相关查询
 * 负责 K 线数据的 CRUD 操作
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { KlineData, KlineQueryParams } from '../types';

/**
 * 插入或更新 K 线数据
 */
export async function upsertKline(db: sqlite3.Database, data: KlineData): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR REPLACE INTO cat_kline 
     (interval, open_time, open_price, high_price, low_price, close_price, volume_cat, volume_usd, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
    [
      data.interval,
      data.open_time,
      data.open_price,
      data.high_price,
      data.low_price,
      data.close_price,
      data.volume_cat,
      data.volume_usd
    ]
  );
}

/**
 * 获取 K 线数据
 */
export async function getKlines(db: sqlite3.Database, params: KlineQueryParams): Promise<any[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  let query = `SELECT * FROM cat_kline WHERE interval = ?`;
  const args: any[] = [params.interval];

  if (params.startTime) {
    query += ` AND open_time >= ?`;
    args.push(params.startTime);
  }
  if (params.endTime) {
    query += ` AND open_time <= ?`;
    args.push(params.endTime);
  }

  // 如果指定了 limit 但没有指定时间范围，返回最新的 limit 条数据
  // 否则按时间升序返回（用于时间范围查询）
  if (params.limit && params.limit > 0 && !params.startTime && !params.endTime) {
    query += ` ORDER BY open_time DESC LIMIT ?`;
    args.push(Math.min(params.limit, 1000)); // 最大限制 1000 条
    const results = await all(query, args) as any[];
    // 反转顺序，返回从最早到最新的数据
    return results.reverse();
  } else {
    query += ` ORDER BY open_time ASC`;
    if (params.limit && params.limit > 0) {
      query += ` LIMIT ?`;
      args.push(Math.min(params.limit, 1000)); // 最大限制 1000 条
    }
    return await all(query, args) as any[];
  }
}

/**
 * 获取最新价格（用于概览）
 */
export async function getLatestPriceForOverview(db: sqlite3.Database): Promise<string | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  
  try {
    const result = await get(
      `SELECT close_price FROM cat_kline 
       WHERE interval = '1h' 
       ORDER BY open_time DESC 
       LIMIT 1`
    ) as { close_price: string } | undefined;
    
    return result?.close_price || null;
  } catch (error) {
    // 如果表不存在或没有数据，返回 null
    return null;
  }
}


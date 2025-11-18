/**
 * Daily Price 相关查询
 * 优化：将价格相关查询独立成模块
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { getDayTimeRange } from './daily.utils';

/**
 * 获取指定日期的开盘价格
 * 优化：单一职责，只负责开盘价格查询，支持多种数据源回退
 */
export async function getOpenPrice(db: sqlite3.Database, day: string): Promise<string | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  
  // 先尝试从 K 线数据获取
  const klineResult = await get(
    `SELECT open_price FROM cat_kline 
     WHERE interval = '1d' AND date(datetime(open_time, 'unixepoch', '+8 hours')) = ? 
     ORDER BY open_time ASC LIMIT 1`,
    [day]
  ) as { open_price: string } | undefined;
  
  if (klineResult?.open_price) {
    return klineResult.open_price;
  }
  
  // 如果没有 K 线数据，尝试从第一笔 Swap 获取
  const firstSwap = await getFirstSwapOfDay(db, day);
  if (firstSwap) {
    const swapResult = await get(
      `SELECT price_usd FROM cat_swaps 
       WHERE block_number = ? AND price_usd IS NOT NULL 
       ORDER BY log_index ASC LIMIT 1`,
      [firstSwap.block_number]
    ) as { price_usd: string } | undefined;
    
    if (swapResult?.price_usd) {
      return swapResult.price_usd;
    }
  }
  
  return null;
}

/**
 * 获取指定日期的第一笔 Swap
 * 优化：单一职责，只负责获取第一笔 Swap
 */
export async function getFirstSwapOfDay(
  db: sqlite3.Database,
  day: string
): Promise<{ block_number: number; block_time: number } | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const { startTime, endTime } = getDayTimeRange(day);
  
  const result = await get(
    `SELECT block_number, block_time 
     FROM cat_swaps 
     WHERE block_time >= ? AND block_time <= ? 
       AND price_usd IS NOT NULL
     ORDER BY block_time ASC, log_index ASC 
     LIMIT 1`,
    [startTime, endTime]
  ) as { block_number: number; block_time: number } | undefined;
  
  return result || null;
}

/**
 * 获取24小时前的价格
 * 优化：单一职责，只负责24小时前价格查询
 */
export async function getPrice24HAgo(db: sqlite3.Database): Promise<string | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const now = Math.floor(Date.now() / 1000);
  const day24Ago = now - 24 * 60 * 60;
  
  const result = await get(
    `SELECT price_usd FROM cat_swaps 
     WHERE block_time >= ? AND price_usd IS NOT NULL 
     ORDER BY block_time ASC LIMIT 1`,
    [day24Ago]
  ) as { price_usd: string } | undefined;
  return result?.price_usd || null;
}


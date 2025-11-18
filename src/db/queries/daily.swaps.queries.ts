/**
 * Daily Swap 相关查询
 * 优化：将 Swap 相关查询独立成模块
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

/**
 * Swap 记录类型定义
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
 * 获取指定时间范围的 Swap 记录
 * 优化：单一职责，只负责按时间范围查询 Swap
 */
export async function getSwapsByTimeRange(
  db: sqlite3.Database,
  startTime: number,
  endTime: number
): Promise<Array<SwapRecord>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  return await all(
    `SELECT id, block_number, block_time, tx_hash, log_index, trader_address, side, amount_cat, amount_usd, price_usd
     FROM cat_swaps
     WHERE block_time >= ? AND block_time <= ? 
       AND side IS NOT NULL 
       AND amount_usd IS NOT NULL
     ORDER BY block_time ASC, log_index ASC`,
    [startTime, endTime]
  ) as Array<SwapRecord>;
}

/**
 * 获取指定 ID 之后的 Swap 记录
 * 优化：单一职责，只负责按 ID 查询 Swap
 */
export async function getSwapsAfterId(
  db: sqlite3.Database,
  swapId: number
): Promise<Array<SwapRecord>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  return await all(
    `SELECT id, block_number, block_time, tx_hash, log_index, trader_address, side, amount_cat, amount_usd, price_usd
     FROM cat_swaps
     WHERE id > ? AND side IS NOT NULL AND amount_usd IS NOT NULL
     ORDER BY id ASC`,
    [swapId]
  ) as Array<SwapRecord>;
}

/**
 * 获取最后处理的 Swap ID
 * 优化：单一职责，只负责获取最大 ID
 */
export async function getLastProcessedSwapId(db: sqlite3.Database): Promise<number> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    'SELECT MAX(id) as max_id FROM cat_swaps WHERE side IS NOT NULL AND amount_usd IS NOT NULL'
  ) as { max_id: number } | undefined;
  return result?.max_id || 0;
}


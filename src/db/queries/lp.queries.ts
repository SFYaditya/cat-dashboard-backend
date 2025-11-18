/**
 * LP 快照相关查询
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

/**
 * 获取指定日期的LP快照
 */
export async function getLpSnapshot(
  db: sqlite3.Database,
  date: string
): Promise<{
  date: string;
  block_number: number;
  block_time: number;
  lp_value_usd: string;
  cat_amount: string;
  usdt_amount: string;
  snapshot_type: string;
} | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    `SELECT date, block_number, block_time, lp_value_usd, cat_amount, usdt_amount, snapshot_type
     FROM cat_lp_daily_snapshot
     WHERE date = ?`,
    [date]
  ) as any;
  
  return result || null;
}

/**
 * 保存或更新LP快照
 */
export async function upsertLpSnapshot(
  db: sqlite3.Database,
  data: {
    date: string;
    block_number: number;
    block_time: number;
    lp_value_usd: string;
    cat_amount: string;
    usdt_amount: string;
    snapshot_type?: string;
  }
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR REPLACE INTO cat_lp_daily_snapshot 
     (date, block_number, block_time, lp_value_usd, cat_amount, usdt_amount, snapshot_type, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
    [
      data.date,
      data.block_number,
      data.block_time,
      data.lp_value_usd,
      data.cat_amount,
      data.usdt_amount,
      data.snapshot_type || 'first_swap'
    ]
  );
}


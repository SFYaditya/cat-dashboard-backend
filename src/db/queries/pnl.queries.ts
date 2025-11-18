/**
 * PnL 相关查询
 * 负责盈亏数据的 CRUD 操作
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { PnlDailyData } from '../types';

/**
 * 插入或更新每日盈亏数据
 */
export async function upsertPnlDaily(
  db: sqlite3.Database,
  address: string,
  date: string,
  data: Omit<PnlDailyData, 'address' | 'date'>
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR REPLACE INTO address_pnl_daily 
     (address, date, buy_cat, buy_usd, sell_cat, sell_usd, realized_pnl_usd, fees_usd, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
    [
      address.toLowerCase(),
      date,
      data.buy_cat,
      data.buy_usd,
      data.sell_cat,
      data.sell_usd,
      data.realized_pnl_usd,
      data.fees_usd
    ]
  );
}

/**
 * 获取地址的盈亏历史
 */
export async function getAddressPnlHistory(
  db: sqlite3.Database,
  address: string,
  days: number = 30
): Promise<Array<{
  date: string;
  buy_cat: string;
  buy_usd: string;
  sell_cat: string;
  sell_usd: string;
  realized_pnl_usd: string;
  fees_usd: string;
}>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  return await all(
    `SELECT date, buy_cat, buy_usd, sell_cat, sell_usd, realized_pnl_usd, fees_usd
     FROM address_pnl_daily
     WHERE address = ? AND date >= ?
     ORDER BY date DESC`,
    [address.toLowerCase(), cutoffDateStr]
  ) as Array<{
    date: string;
    buy_cat: string;
    buy_usd: string;
    sell_cat: string;
    sell_usd: string;
    realized_pnl_usd: string;
    fees_usd: string;
  }>;
}

/**
 * 获取地址的盈亏汇总
 */
export async function getAddressPnlSummary(
  db: sqlite3.Database,
  address: string
): Promise<{
  total_buy_cat: string;
  total_buy_usd: string;
  total_sell_cat: string;
  total_sell_usd: string;
  total_realized_pnl_usd: string;
  total_fees_usd: string;
}> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const results = await all(
    `SELECT 
       SUM(CAST(buy_cat AS REAL)) as total_buy_cat,
       SUM(CAST(buy_usd AS REAL)) as total_buy_usd,
       SUM(CAST(sell_cat AS REAL)) as total_sell_cat,
       SUM(CAST(sell_usd AS REAL)) as total_sell_usd,
       SUM(CAST(realized_pnl_usd AS REAL)) as total_realized_pnl_usd,
       SUM(CAST(fees_usd AS REAL)) as total_fees_usd
     FROM address_pnl_daily
     WHERE address = ?`,
    [address.toLowerCase()]
  ) as Array<{
    total_buy_cat: number;
    total_buy_usd: number;
    total_sell_cat: number;
    total_sell_usd: number;
    total_realized_pnl_usd: number;
    total_fees_usd: number;
  }>;
  
  const result = results[0] || {};
  return {
    total_buy_cat: (result.total_buy_cat || 0).toString(),
    total_buy_usd: (result.total_buy_usd || 0).toString(),
    total_sell_cat: (result.total_sell_cat || 0).toString(),
    total_sell_usd: (result.total_sell_usd || 0).toString(),
    total_realized_pnl_usd: (result.total_realized_pnl_usd || 0).toString(),
    total_fees_usd: (result.total_fees_usd || 0).toString()
  };
}


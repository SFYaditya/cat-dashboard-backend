/**
 * Address 相关查询
 * 负责地址统计、标签、轮回等查询
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { AddressStatsData, AddressRoundData } from '../types';

/**
 * 获取地址标签
 */
export async function getAddressLabel(db: sqlite3.Database, address: string): Promise<any | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  return await get(
    'SELECT * FROM address_labels WHERE address = ?',
    [address.toLowerCase()]
  ) as any | undefined || null;
}

/**
 * 插入或更新地址统计
 */
export async function upsertAddressStats(db: sqlite3.Database, data: AddressStatsData): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR REPLACE INTO cat_address_trade_stats 
     (address, trade_count, buy_count, sell_count, buy_volume_cat, sell_volume_cat,
      buy_volume_usd, sell_volume_usd, current_position_cat, current_cost_usd, avg_buy_price,
      realized_pnl_usd, unrealized_pnl_usd, total_pnl_usd, roi_total,
      profit_round_count, loss_round_count, current_round_pnl_usd,
      first_trade_at, last_trade_at, is_new_address, is_swing_trader,
      is_profitable_realized, is_profitable_total, is_deep_loss,
      last_7d_volume_usd, last_7d_trades, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
    [
      data.address,
      data.trade_count,
      data.buy_count,
      data.sell_count,
      data.buy_volume_cat,
      data.sell_volume_cat,
      data.buy_volume_usd,
      data.sell_volume_usd,
      data.current_position_cat,
      data.current_cost_usd,
      data.avg_buy_price,
      data.realized_pnl_usd,
      data.unrealized_pnl_usd,
      data.total_pnl_usd,
      data.roi_total,
      data.profit_round_count,
      data.loss_round_count,
      data.current_round_pnl_usd,
      data.first_trade_at,
      data.last_trade_at,
      data.is_new_address,
      data.is_swing_trader,
      data.is_profitable_realized,
      data.is_profitable_total,
      data.is_deep_loss,
      data.last_7d_volume_usd,
      data.last_7d_trades
    ]
  );
}

/**
 * 获取地址统计
 */
export async function getAddressStats(db: sqlite3.Database, address: string): Promise<any | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  return await get(
    'SELECT * FROM cat_address_trade_stats WHERE address = ?',
    [address.toLowerCase()]
  ) as any | undefined || null;
}

/**
 * 插入地址轮回记录
 */
export async function insertAddressRound(db: sqlite3.Database, data: AddressRoundData): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR REPLACE INTO cat_address_rounds 
     (address, round_index, start_time, end_time, buy_volume_cat, buy_volume_usd,
      sell_volume_cat, sell_volume_usd, realized_pnl_usd, result_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.address,
      data.round_index,
      data.start_time,
      data.end_time,
      data.buy_volume_cat,
      data.buy_volume_usd,
      data.sell_volume_cat,
      data.sell_volume_usd,
      data.realized_pnl_usd,
      data.result_type
    ]
  );
}

/**
 * 获取地址的轮回记录
 */
export async function getAddressRounds(db: sqlite3.Database, address: string): Promise<any[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  return await all(
    `SELECT * FROM cat_address_rounds 
     WHERE address = ? 
     ORDER BY round_index ASC`,
    [address.toLowerCase()]
  ) as any[];
}

/**
 * 获取所有交易地址
 */
export async function getAllTradingAddresses(db: sqlite3.Database): Promise<string[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const results = await all(
    `SELECT DISTINCT trader_address FROM cat_swaps WHERE side IS NOT NULL`
  ) as Array<{ trader_address: string }>;
  return results.map(r => r.trader_address);
}

/**
 * 获取所有交易地址（用于统计计算）
 */
export async function getAllTraderAddresses(db: sqlite3.Database): Promise<string[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const results = await all(
    `SELECT DISTINCT trader_address FROM cat_swaps WHERE side IS NOT NULL AND amount_usd IS NOT NULL`
  ) as Array<{ trader_address: string }>;
  return results.map(r => r.trader_address);
}

/**
 * 获取地址最近7天的交易统计
 */
export async function getAddressLast7DStats(
  db: sqlite3.Database,
  address: string
): Promise<{
  volume_usd: string;
  trades: number;
}> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const now = Math.floor(Date.now() / 1000);
  const day7Ago = now - 7 * 24 * 60 * 60;

  const swaps = await all(
    `SELECT amount_usd FROM cat_swaps
     WHERE trader_address = ? AND block_time >= ? AND amount_usd IS NOT NULL`,
    [address.toLowerCase(), day7Ago]
  ) as { amount_usd: string }[];

  const volumeUsd = swaps.reduce((sum, s) => sum + parseFloat(s.amount_usd || '0'), 0);

  return {
    volume_usd: volumeUsd.toFixed(6),
    trades: swaps.length
  };
}


/**
 * Swap 相关查询
 * 负责 Swap 记录的 CRUD 操作和复杂查询
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { SwapData, SwapUpdateData, SwapsFilterParams } from '../types';

/**
 * 插入 Swap 记录
 */
export async function insertSwap(db: sqlite3.Database, data: SwapData): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR IGNORE INTO cat_swaps 
     (block_number, block_time, tx_hash, log_index, trader_address, side, amount_cat, amount_usd, price_usd, pair_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.block_number,
      data.block_time,
      data.tx_hash,
      data.log_index,
      data.trader_address,
      data.side,
      data.amount_cat,
      data.amount_usd,
      data.price_usd,
      data.pair_address
    ]
  );
}

/**
 * 更新 Swap 记录
 */
export async function updateSwap(db: sqlite3.Database, data: SwapUpdateData): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `UPDATE cat_swaps 
     SET side = ?, amount_cat = ?, amount_usd = ?, price_usd = ?, is_large = ?, is_whale = ?
     WHERE tx_hash = ? AND log_index = ?`,
    [
      data.side,
      data.amount_cat,
      data.amount_usd,
      data.price_usd,
      data.is_large ? 1 : 0,
      data.is_whale ? 1 : 0,
      data.tx_hash,
      data.log_index
    ]
  );
}

/**
 * 获取需要回填的 Swap 记录
 */
export async function getSwapsNeedingBackfill(db: sqlite3.Database, limit: number = 100): Promise<any[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  return await all(
    `SELECT * FROM cat_swaps 
     WHERE amount_usd IS NULL OR price_usd IS NULL 
     ORDER BY block_number ASC, log_index ASC 
     LIMIT ?`,
    [limit]
  ) as any[];
}

/**
 * 获取 Swap 统计信息
 */
export async function getSwapSummary(db: sqlite3.Database, limit: number = 100): Promise<any> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  const swaps = await all(
    `SELECT * FROM cat_swaps 
     WHERE price_usd IS NOT NULL AND amount_usd IS NOT NULL
     ORDER BY block_time DESC 
     LIMIT ?`,
    [limit]
  ) as any[];

  if (swaps.length === 0) {
    return {
      total: 0,
      total_volume_usd: '0',
      avg_price: '0',
      latest_price: '0'
    };
  }

  const totalVolumeUsd = swaps.reduce((sum, s) => sum + parseFloat(s.amount_usd || '0'), 0);
  const avgPrice = swaps.reduce((sum, s) => sum + parseFloat(s.price_usd || '0'), 0) / swaps.length;
  const latestPrice = parseFloat(swaps[0].price_usd || '0');

  return {
    total: swaps.length,
    total_volume_usd: totalVolumeUsd.toFixed(6),
    avg_price: avgPrice.toFixed(8),
    latest_price: latestPrice.toFixed(8)
  };
}

/**
 * 获取最新 Swap 记录
 */
export async function getLatestSwaps(db: sqlite3.Database, limit: number = 20): Promise<any[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  return await all(
    `SELECT * FROM cat_swaps 
     WHERE price_usd IS NOT NULL AND amount_usd IS NOT NULL
     ORDER BY block_time DESC, log_index DESC 
     LIMIT ?`,
    [limit]
  ) as any[];
}

/**
 * 获取地址的 Swap 记录
 */
export async function getAddressSwaps(db: sqlite3.Database, address: string): Promise<any[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  // 优化：按时间升序排序，确保计算时按时间顺序处理
  return await all(
    `SELECT * FROM cat_swaps 
     WHERE trader_address = ? 
     ORDER BY block_time ASC, log_index ASC`,
    [address.toLowerCase()]
  ) as any[];
}

/**
 * 获取 Swaps（支持高级筛选和分页）
 */
export async function getSwapsWithFilters(
  db: sqlite3.Database,
  params: SwapsFilterParams
): Promise<{ swaps: any[]; total: number }> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  // 添加 LEFT JOIN address_labels 以获取合约信息
  let query = `SELECT s.*, l.is_contract FROM cat_swaps s LEFT JOIN address_labels l ON s.trader_address = l.address`;
  const args: any[] = [];
  const conditions: string[] = [];

  // 基础条件
  conditions.push(`s.price_usd IS NOT NULL`);
  conditions.push(`s.amount_usd IS NOT NULL`);

  // 方向筛选
  if (params.side && params.side !== 'all') {
    conditions.push(`s.side = ?`);
    args.push(params.side);
  }

  // 金额范围
  if (params.minAmountUsd !== undefined) {
    conditions.push(`CAST(s.amount_usd AS REAL) >= ?`);
    args.push(params.minAmountUsd);
  }
  if (params.maxAmountUsd !== undefined) {
    conditions.push(`CAST(s.amount_usd AS REAL) <= ?`);
    args.push(params.maxAmountUsd);
  }

  // 大额/土豪
  if (params.onlyLarge) {
    conditions.push(`s.is_large = 1`);
  }
  if (params.onlyWhale) {
    conditions.push(`s.is_whale = 1`);
  }

  // 地址筛选
  if (params.address) {
    conditions.push(`s.trader_address = ?`);
    args.push(params.address.toLowerCase());
  }

  // 时间范围
  if (params.startTime) {
    conditions.push(`s.block_time >= ?`);
    args.push(params.startTime);
  }
  if (params.endTime) {
    conditions.push(`s.block_time <= ?`);
    args.push(params.endTime);
  }

  // 地址维度筛选（需要JOIN）
  if (params.filterNewAddress || params.filterSwingTrader || 
      params.filterProfitable || params.filterDeepLoss) {
    query += ` LEFT JOIN cat_address_trade_stats stats ON s.trader_address = stats.address`;
    
    if (params.filterNewAddress) {
      conditions.push(`stats.is_new_address = 1`);
    }
    if (params.filterSwingTrader) {
      conditions.push(`stats.is_swing_trader = 1`);
    }
    if (params.filterProfitable) {
      conditions.push(`(stats.is_profitable_realized = 1 OR stats.is_profitable_total = 1)`);
    }
    if (params.filterDeepLoss) {
      conditions.push(`stats.is_deep_loss = 1`);
    }
  } else {
    // 如果没有地址维度筛选，但需要合约信息，确保 JOIN address_labels
    // 注意：如果已经有 JOIN，这里不会重复添加
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ` ORDER BY s.block_time DESC, s.log_index DESC`;

  // 获取总数 - 使用 COUNT(DISTINCT s.id) 避免 JOIN 导致的重复计数
  const countQuery = query.replace(/SELECT s\.\*,?\s*l\.is_contract FROM/, 'SELECT COUNT(DISTINCT s.id) as total FROM');
  const countResult = await all(countQuery, args) as any[];
  const total = countResult[0]?.total || 0;

  // 分页
  if (params.offset !== undefined) {
    query += ` LIMIT ? OFFSET ?`;
    args.push(params.limit || 50);
    args.push(params.offset);
  } else if (params.limit) {
    query += ` LIMIT ?`;
    args.push(params.limit);
  }

  const swaps = await all(query, args) as any[];
  return { swaps, total };
}

/**
 * 获取指定时间范围的 Swap 记录（用于 K 线聚合）
 */
export async function getSwapsForKline(
  db: sqlite3.Database,
  startTime?: number,
  endTime?: number
): Promise<any[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  let query = `SELECT block_time, price_usd, amount_cat, amount_usd, log_index
               FROM cat_swaps
               WHERE price_usd IS NOT NULL AND amount_usd IS NOT NULL`;
  const args: any[] = [];

  if (startTime) {
    query += ` AND block_time >= ?`;
    args.push(startTime);
  }
  if (endTime) {
    query += ` AND block_time <= ?`;
    args.push(endTime);
  }

  query += ` ORDER BY block_time ASC, log_index ASC`;

  return await all(query, args) as any[];
}

/**
 * 获取最新价格
 */
export async function getLatestPrice(db: sqlite3.Database): Promise<string | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    `SELECT price_usd FROM cat_swaps 
     WHERE price_usd IS NOT NULL 
     ORDER BY block_time DESC, log_index DESC 
     LIMIT 1`
  ) as { price_usd: string } | undefined;
  return result?.price_usd || null;
}

/**
 * 获取当前价格（用于概览）
 */
export async function getCurrentPrice(db: sqlite3.Database): Promise<string | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    `SELECT close_price FROM cat_kline 
     WHERE interval = '1h' 
     ORDER BY open_time DESC 
     LIMIT 1`
  ) as { close_price: string } | undefined;
  
  if (result?.close_price) {
    return result.close_price;
  }
  
  // 如果没有 K 线数据，使用最新 Swap 价格
  return getLatestPrice(db);
}


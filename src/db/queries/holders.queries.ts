/**
 * Holder 相关查询
 * 负责持仓记录的 CRUD 操作
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

/**
 * 更新持仓余额
 */
export async function updateHolderBalance(
  db: sqlite3.Database,
  address: string,
  delta: string,
  operation: 'add' | 'subtract'
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  
  const addr = address.toLowerCase();
  const deltaNum = parseFloat(delta);
  
  // 获取当前余额
  const current = await get(
    'SELECT balance_cat FROM cat_holders WHERE address = ?',
    [addr]
  ) as { balance_cat: string } | undefined;
  
  const currentBalance = current ? parseFloat(current.balance_cat) : 0;
  const newBalance = operation === 'add' 
    ? currentBalance + deltaNum 
    : Math.max(0, currentBalance - deltaNum);
  
  // 更新或插入
  await run(
    `INSERT OR REPLACE INTO cat_holders (address, balance_cat, updated_at)
     VALUES (?, ?, strftime('%s', 'now'))`,
    [addr, newBalance.toString()]
  );
}

/**
 * 获取持仓余额
 */
export async function getHolderBalance(
  db: sqlite3.Database,
  address: string
): Promise<{ balance_cat: string } | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    'SELECT balance_cat FROM cat_holders WHERE address = ?',
    [address.toLowerCase()]
  ) as { balance_cat: string } | undefined;
  return result || null;
}

/**
 * 获取最新链上余额
 */
export async function getLatestChainBalance(
  db: sqlite3.Database,
  address: string
): Promise<{ balance_cat_after: string; balance_usdt_after: string } | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    `SELECT balance_cat_after, balance_usdt_after 
     FROM cat_swaps 
     WHERE trader_address = ? 
       AND balance_cat_after IS NOT NULL 
       AND balance_usdt_after IS NOT NULL
     ORDER BY block_time DESC, log_index DESC 
     LIMIT 1`,
    [address.toLowerCase()]
  ) as { balance_cat_after: string; balance_usdt_after: string } | undefined;
  return result || null;
}

/**
 * 获取当前持仓地址数
 */
export async function getCurrentHoldersCount(db: sqlite3.Database): Promise<number> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    `SELECT COUNT(*) as count FROM cat_holders WHERE CAST(balance_cat AS REAL) > 0`
  ) as { count: number } | undefined;
  return result?.count || 0;
}

/**
 * 获取指定日期的持仓地址数
 */
export async function getHoldersCountForDay(db: sqlite3.Database, day: string): Promise<number> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    `SELECT COUNT(*) as count 
     FROM cat_holders_daily 
     WHERE day = ? AND CAST(balance_cat AS REAL) > 0`,
    [day]
  ) as { count: number } | undefined;
  return result?.count || 0;
}

/**
 * 保存每日持仓快照
 */
export async function saveDailyHoldersSnapshot(db: sqlite3.Database, day: string): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  // 获取所有持仓地址
  const holders = await all(
    `SELECT address, balance_cat FROM cat_holders WHERE CAST(balance_cat AS REAL) > 0`
  ) as Array<{ address: string; balance_cat: string }>;
  
  // 批量插入
  await run('BEGIN TRANSACTION');
  try {
    for (const holder of holders) {
      await run(
        `INSERT OR REPLACE INTO cat_holders_daily (day, address, balance_cat)
         VALUES (?, ?, ?)`,
        [day, holder.address, holder.balance_cat]
      );
    }
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
}

/**
 * 获取指定日期的开盘持仓地址数
 */
export async function getOpenHoldersCount(db: sqlite3.Database, day: string): Promise<number | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    `SELECT COUNT(*) as count 
     FROM cat_holders_daily 
     WHERE day = ? AND CAST(balance_cat AS REAL) > 0`,
    [day]
  ) as { count: number } | undefined;
  return result?.count ?? null;
}


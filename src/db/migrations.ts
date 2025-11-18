/**
 * 数据库迁移和表结构定义
 * 负责所有表的创建和字段迁移
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

/**
 * 执行表创建和迁移
 */
export async function runMigrations(db: sqlite3.Database): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;

  // 1. sync_state 表
  await run(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      last_block INTEGER NOT NULL DEFAULT 0,
      start_block INTEGER,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  await safeAddColumn(db, 'sync_state', 'start_block', 'INTEGER');
  await run(`
    INSERT OR IGNORE INTO sync_state (key, last_block, updated_at)
    VALUES ('cat_indexer', 0, strftime('%s', 'now'))
  `);

  // backfill_state 表
  await run(`
    CREATE TABLE IF NOT EXISTS backfill_state (
      id TEXT PRIMARY KEY,
      last_processed_event_index INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 2. cat_transfers 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_number INTEGER NOT NULL,
      block_time INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      amount_cat TEXT NOT NULL,
      is_swap_related INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(tx_hash, log_index)
    )
  `);
  await safeAddColumn(db, 'cat_transfers', 'transfer_type', 'TEXT');
  await createIndex(db, 'idx_cat_transfers_block', 'cat_transfers', 'block_number');
  await createIndex(db, 'idx_cat_transfers_tx', 'cat_transfers', 'tx_hash');
  await createIndex(db, 'idx_cat_transfers_from', 'cat_transfers', 'from_address');
  await createIndex(db, 'idx_cat_transfers_to', 'cat_transfers', 'to_address');
  await createIndex(db, 'idx_cat_transfers_type', 'cat_transfers', 'transfer_type');
  await run(`CREATE INDEX IF NOT EXISTS idx_cat_transfers_date ON cat_transfers(date(datetime(block_time, 'unixepoch', '+8 hours')))`);

  // 3. cat_swaps 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_swaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_number INTEGER NOT NULL,
      block_time INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      trader_address TEXT NOT NULL,
      amount_cat TEXT NOT NULL,
      amount_usd TEXT,
      price_usd TEXT,
      side TEXT,
      pair_address TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(tx_hash, log_index)
    )
  `);
  
  // 添加可选字段
  const swapOptionalColumns = [
    'amount_usd', 'price_usd', 'side', 'is_large', 'is_whale',
    'trade_label_primary', 'trade_label_secondary',
    'balance_cat_after', 'balance_usdt_after',
    'snapshot_cat_balance', 'snapshot_usdt_balance'
  ];
  for (const col of swapOptionalColumns) {
    const type = col.includes('balance') || col.includes('amount') || col.includes('price') || col.includes('label') 
      ? 'TEXT' : col === 'is_large' || col === 'is_whale' ? 'INTEGER DEFAULT 0' : 'TEXT';
    await safeAddColumn(db, 'cat_swaps', col, type);
  }
  
  await createIndex(db, 'idx_cat_swaps_block', 'cat_swaps', 'block_number');
  await createIndex(db, 'idx_cat_swaps_tx', 'cat_swaps', 'tx_hash');
  await createIndex(db, 'idx_cat_swaps_trader', 'cat_swaps', 'trader_address');

  // 4. cat_holders 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_holders (
      address TEXT PRIMARY KEY,
      balance_cat TEXT NOT NULL DEFAULT '0',
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  await createIndex(db, 'idx_cat_holders_balance', 'cat_holders', 'balance_cat');

  // 5. address_labels 表
  await run(`
    CREATE TABLE IF NOT EXISTS address_labels (
      address TEXT PRIMARY KEY,
      is_contract INTEGER NOT NULL DEFAULT 0,
      contract_type TEXT,
      label TEXT,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 6. cat_address_trade_stats 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_address_trade_stats (
      address TEXT PRIMARY KEY,
      trade_count INTEGER NOT NULL DEFAULT 0,
      buy_count INTEGER NOT NULL DEFAULT 0,
      sell_count INTEGER NOT NULL DEFAULT 0,
      buy_volume_cat TEXT NOT NULL DEFAULT '0',
      sell_volume_cat TEXT NOT NULL DEFAULT '0',
      buy_volume_usd TEXT NOT NULL DEFAULT '0',
      sell_volume_usd TEXT NOT NULL DEFAULT '0',
      current_position_cat TEXT NOT NULL DEFAULT '0',
      current_cost_usd TEXT NOT NULL DEFAULT '0',
      avg_buy_price TEXT,
      realized_pnl_usd TEXT NOT NULL DEFAULT '0',
      unrealized_pnl_usd TEXT NOT NULL DEFAULT '0',
      total_pnl_usd TEXT NOT NULL DEFAULT '0',
      roi_total TEXT,
      profit_round_count INTEGER NOT NULL DEFAULT 0,
      loss_round_count INTEGER NOT NULL DEFAULT 0,
      current_round_pnl_usd TEXT NOT NULL DEFAULT '0',
      first_trade_at INTEGER,
      last_trade_at INTEGER,
      is_new_address INTEGER NOT NULL DEFAULT 0,
      is_swing_trader INTEGER NOT NULL DEFAULT 0,
      is_profitable_realized INTEGER NOT NULL DEFAULT 0,
      is_profitable_total INTEGER NOT NULL DEFAULT 0,
      is_deep_loss INTEGER NOT NULL DEFAULT 0,
      last_7d_volume_usd TEXT NOT NULL DEFAULT '0',
      last_7d_trades INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  const statsOptionalColumns = [
    'is_new_address', 'is_swing_trader', 'is_profitable_realized',
    'is_profitable_total', 'is_deep_loss',
    'last_7d_volume_usd', 'last_7d_trades'
  ];
  for (const col of statsOptionalColumns) {
    const type = col.includes('is_') ? 'INTEGER NOT NULL DEFAULT 0' 
      : col.includes('trades') ? 'INTEGER NOT NULL DEFAULT 0' 
      : 'TEXT NOT NULL DEFAULT \'0\'';
    await safeAddColumn(db, 'cat_address_trade_stats', col, type);
  }
  await createIndex(db, 'idx_address_stats_updated', 'cat_address_trade_stats', 'updated_at');

  // 7. cat_address_rounds 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_address_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      round_index INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      buy_volume_cat TEXT NOT NULL DEFAULT '0',
      buy_volume_usd TEXT NOT NULL DEFAULT '0',
      sell_volume_cat TEXT NOT NULL DEFAULT '0',
      sell_volume_usd TEXT NOT NULL DEFAULT '0',
      realized_pnl_usd TEXT NOT NULL DEFAULT '0',
      result_type TEXT CHECK(result_type IN ('profit', 'loss')),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(address, round_index)
    )
  `);
  await createIndex(db, 'idx_address_rounds_address', 'cat_address_rounds', 'address');
  await createIndex(db, 'idx_address_rounds_time', 'cat_address_rounds', 'start_time');

  // 8. cat_kline 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_kline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      interval TEXT NOT NULL,
      open_time INTEGER NOT NULL,
      open_price TEXT NOT NULL,
      high_price TEXT NOT NULL,
      low_price TEXT NOT NULL,
      close_price TEXT NOT NULL,
      volume_cat TEXT NOT NULL DEFAULT '0',
      volume_usd TEXT NOT NULL DEFAULT '0',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(interval, open_time)
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_kline_interval_time ON cat_kline(interval, open_time)`);
  await createIndex(db, 'idx_kline_time', 'cat_kline', 'open_time');

  // 9. cat_daily_metrics 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_daily_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL UNIQUE,
      open_price TEXT NOT NULL,
      close_price TEXT NOT NULL,
      high_price TEXT NOT NULL,
      low_price TEXT NOT NULL,
      swaps_count INTEGER NOT NULL DEFAULT 0,
      volume_cat TEXT NOT NULL DEFAULT '0',
      volume_usd TEXT NOT NULL DEFAULT '0',
      unique_traders INTEGER NOT NULL DEFAULT 0,
      holders_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  await createIndex(db, 'idx_daily_metrics_day', 'cat_daily_metrics', 'day');

  // 10. cat_holders_daily 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_holders_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      address TEXT NOT NULL,
      balance_cat TEXT NOT NULL DEFAULT '0',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(day, address)
    )
  `);
  await createIndex(db, 'idx_holders_daily_day', 'cat_holders_daily', 'day');
  await createIndex(db, 'idx_holders_daily_address', 'cat_holders_daily', 'address');

  // 11. address_pnl_daily 表
  await run(`
    CREATE TABLE IF NOT EXISTS address_pnl_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      date TEXT NOT NULL,
      buy_cat TEXT NOT NULL DEFAULT '0',
      buy_usd TEXT NOT NULL DEFAULT '0',
      sell_cat TEXT NOT NULL DEFAULT '0',
      sell_usd TEXT NOT NULL DEFAULT '0',
      realized_pnl_usd TEXT NOT NULL DEFAULT '0',
      fees_usd TEXT NOT NULL DEFAULT '0',
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(address, date)
    )
  `);
  await createIndex(db, 'idx_pnl_daily_address', 'address_pnl_daily', 'address');
  await createIndex(db, 'idx_pnl_daily_date', 'address_pnl_daily', 'date');
  await run(`CREATE INDEX IF NOT EXISTS idx_pnl_daily_address_date ON address_pnl_daily(address, date)`);

  // 12. cat_daily_trade_stats 表
  await run(`
    CREATE TABLE IF NOT EXISTS cat_daily_trade_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      buy_address_count INTEGER NOT NULL DEFAULT 0,
      sell_address_count INTEGER NOT NULL DEFAULT 0,
      total_buy_cat TEXT NOT NULL DEFAULT '0',
      total_sell_cat TEXT NOT NULL DEFAULT '0',
      buy_tx_count INTEGER NOT NULL DEFAULT 0,
      sell_tx_count INTEGER NOT NULL DEFAULT 0,
      net_flow_cat TEXT NOT NULL DEFAULT '0',
      unique_trader_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  await createIndex(db, 'idx_daily_trade_stats_date', 'cat_daily_trade_stats', 'date');

  // 13. cat_lp_daily_snapshot 表 - 存储每日0点或第一笔交易后的LP快照
  await run(`
    CREATE TABLE IF NOT EXISTS cat_lp_daily_snapshot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      block_number INTEGER NOT NULL,
      block_time INTEGER NOT NULL,
      lp_value_usd TEXT NOT NULL,
      cat_amount TEXT NOT NULL,
      usdt_amount TEXT NOT NULL,
      snapshot_type TEXT NOT NULL DEFAULT 'first_swap',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);
  await createIndex(db, 'idx_lp_snapshot_date', 'cat_lp_daily_snapshot', 'date');
  await createIndex(db, 'idx_lp_snapshot_block', 'cat_lp_daily_snapshot', 'block_number');

  console.log('Database tables initialized');
}

/**
 * 安全添加列（如果列不存在）
 */
async function safeAddColumn(
  db: sqlite3.Database,
  table: string,
  column: string,
  type: string
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  try {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch (e: any) {
    // 列已存在，忽略错误
  }
}

/**
 * 创建索引（如果不存在）
 */
async function createIndex(
  db: sqlite3.Database,
  indexName: string,
  table: string,
  column: string
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column})`);
}


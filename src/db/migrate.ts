/**
 * 数据库迁移脚本
 * 支持 SQLite 和 PostgreSQL
 */
import dotenv from 'dotenv';
import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { getDatabase, DB_TYPE } from './connection';

dotenv.config();

/**
 * PostgreSQL 迁移脚本
 */
async function runPostgresMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. sync_state 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_state (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        last_block BIGINT NOT NULL DEFAULT 0,
        start_block BIGINT,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
      )
    `);
    
    // 添加 start_block 列（如果不存在）
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='sync_state' AND column_name='start_block'
        ) THEN
          ALTER TABLE sync_state ADD COLUMN start_block BIGINT;
        END IF;
      END $$;
    `);
    
    await client.query(`
      INSERT INTO sync_state (key, last_block, updated_at)
      VALUES ('cat_indexer', 0, EXTRACT(EPOCH FROM NOW())::BIGINT)
      ON CONFLICT (key) DO NOTHING
    `);

    // 2. backfill_state 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS backfill_state (
        id TEXT PRIMARY KEY,
        last_processed_event_index BIGINT NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
      )
    `);

    // 3. cat_transfers 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_transfers (
        id SERIAL PRIMARY KEY,
        block_number BIGINT NOT NULL,
        block_time BIGINT NOT NULL,
        tx_hash TEXT NOT NULL,
        log_index INTEGER NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount_cat TEXT NOT NULL,
        is_swap_related INTEGER NOT NULL DEFAULT 0,
        transfer_type TEXT,
        created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        UNIQUE(tx_hash, log_index)
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_transfers_block ON cat_transfers(block_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_transfers_tx ON cat_transfers(tx_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_transfers_from ON cat_transfers(from_address)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_transfers_to ON cat_transfers(to_address)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_transfers_type ON cat_transfers(transfer_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_transfers_date ON cat_transfers(DATE(to_timestamp(block_time) + interval '8 hours'))`);

    // 4. cat_swaps 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_swaps (
        id SERIAL PRIMARY KEY,
        block_number BIGINT NOT NULL,
        block_time BIGINT NOT NULL,
        tx_hash TEXT NOT NULL,
        log_index INTEGER NOT NULL,
        trader_address TEXT NOT NULL,
        amount_cat TEXT NOT NULL,
        amount_usd TEXT,
        price_usd TEXT,
        side TEXT,
        pair_address TEXT NOT NULL,
        is_large INTEGER DEFAULT 0,
        is_whale INTEGER DEFAULT 0,
        trade_label_primary TEXT,
        trade_label_secondary TEXT,
        balance_cat_after TEXT,
        balance_usdt_after TEXT,
        snapshot_cat_balance TEXT,
        snapshot_usdt_balance TEXT,
        created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        UNIQUE(tx_hash, log_index)
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_swaps_block ON cat_swaps(block_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_swaps_tx ON cat_swaps(tx_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_swaps_trader ON cat_swaps(trader_address)`);

    // 5. cat_holders 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_holders (
        address TEXT PRIMARY KEY,
        balance_cat TEXT NOT NULL DEFAULT '0',
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cat_holders_balance ON cat_holders(balance_cat)`);

    // 6. address_labels 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS address_labels (
        address TEXT PRIMARY KEY,
        is_contract INTEGER NOT NULL DEFAULT 0,
        contract_type TEXT,
        label TEXT,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
      )
    `);

    // 7. cat_address_trade_stats 表
    await client.query(`
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
        first_trade_at BIGINT,
        last_trade_at BIGINT,
        is_new_address INTEGER NOT NULL DEFAULT 0,
        is_swing_trader INTEGER NOT NULL DEFAULT 0,
        is_profitable_realized INTEGER NOT NULL DEFAULT 0,
        is_profitable_total INTEGER NOT NULL DEFAULT 0,
        is_deep_loss INTEGER NOT NULL DEFAULT 0,
        last_7d_volume_usd TEXT NOT NULL DEFAULT '0',
        last_7d_trades INTEGER NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_address_stats_updated ON cat_address_trade_stats(updated_at)`);

    // 8. cat_address_rounds 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_address_rounds (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        round_index INTEGER NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT,
        buy_volume_cat TEXT NOT NULL DEFAULT '0',
        buy_volume_usd TEXT NOT NULL DEFAULT '0',
        sell_volume_cat TEXT NOT NULL DEFAULT '0',
        sell_volume_usd TEXT NOT NULL DEFAULT '0',
        realized_pnl_usd TEXT NOT NULL DEFAULT '0',
        result_type TEXT CHECK(result_type IN ('profit', 'loss')),
        created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        UNIQUE(address, round_index)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_address_rounds_address ON cat_address_rounds(address)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_address_rounds_time ON cat_address_rounds(start_time)`);

    // 9. cat_kline 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_kline (
        id SERIAL PRIMARY KEY,
        interval TEXT NOT NULL,
        open_time BIGINT NOT NULL,
        open_price TEXT NOT NULL,
        high_price TEXT NOT NULL,
        low_price TEXT NOT NULL,
        close_price TEXT NOT NULL,
        volume_cat TEXT NOT NULL DEFAULT '0',
        volume_usd TEXT NOT NULL DEFAULT '0',
        created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        UNIQUE(interval, open_time)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kline_interval_time ON cat_kline(interval, open_time)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kline_time ON cat_kline(open_time)`);

    // 10. cat_daily_metrics 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_daily_metrics (
        id SERIAL PRIMARY KEY,
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
        created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_metrics_day ON cat_daily_metrics(day)`);

    // 11. cat_holders_daily 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_holders_daily (
        id SERIAL PRIMARY KEY,
        day TEXT NOT NULL,
        address TEXT NOT NULL,
        balance_cat TEXT NOT NULL DEFAULT '0',
        created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        UNIQUE(day, address)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_holders_daily_day ON cat_holders_daily(day)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_holders_daily_address ON cat_holders_daily(address)`);

    // 12. address_pnl_daily 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS address_pnl_daily (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        date TEXT NOT NULL,
        buy_cat TEXT NOT NULL DEFAULT '0',
        buy_usd TEXT NOT NULL DEFAULT '0',
        sell_cat TEXT NOT NULL DEFAULT '0',
        sell_usd TEXT NOT NULL DEFAULT '0',
        realized_pnl_usd TEXT NOT NULL DEFAULT '0',
        fees_usd TEXT NOT NULL DEFAULT '0',
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        UNIQUE(address, date)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pnl_daily_address ON address_pnl_daily(address)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pnl_daily_date ON address_pnl_daily(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pnl_daily_address_date ON address_pnl_daily(address, date)`);

    // 13. cat_daily_trade_stats 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_daily_trade_stats (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        buy_address_count INTEGER NOT NULL DEFAULT 0,
        sell_address_count INTEGER NOT NULL DEFAULT 0,
        total_buy_cat TEXT NOT NULL DEFAULT '0',
        total_sell_cat TEXT NOT NULL DEFAULT '0',
        buy_tx_count INTEGER NOT NULL DEFAULT 0,
        sell_tx_count INTEGER NOT NULL DEFAULT 0,
        net_flow_cat TEXT NOT NULL DEFAULT '0',
        unique_trader_count INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_trade_stats_date ON cat_daily_trade_stats(date)`);

    // 14. cat_lp_daily_snapshot 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_lp_daily_snapshot (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        block_number BIGINT NOT NULL,
        block_time BIGINT NOT NULL,
        lp_value_usd TEXT NOT NULL,
        cat_amount TEXT NOT NULL,
        usdt_amount TEXT NOT NULL,
        snapshot_type TEXT NOT NULL DEFAULT 'first_swap',
        created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lp_snapshot_date ON cat_lp_daily_snapshot(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lp_snapshot_block ON cat_lp_daily_snapshot(block_number)`);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * SQLite 迁移（使用现有的 migrations.ts）
 */
async function runSqliteMigrations(db: sqlite3.Database): Promise<void> {
  const { runMigrations } = await import('./migrations');
  await runMigrations(db);
  console.log('✅ SQLite migrations completed successfully');
}

/**
 * 主迁移函数
 */
async function main() {
  console.log('🚀 Starting database migrations...\n');
  
  // 检查数据库类型
  const databaseUrl = process.env.DATABASE_URL;
  const databasePath = process.env.DATABASE_PATH;
  
  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    console.log('📊 Database type: PostgreSQL');
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    await runPostgresMigrations(pool);
    await pool.end();
  } else if (databasePath) {
    console.log('📊 Database type: SQLite');
    const sqliteDb = new sqlite3.Database(databasePath);
    await runSqliteMigrations(sqliteDb);
    await new Promise<void>((resolve, reject) => {
      sqliteDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    // 尝试使用 getDatabase（向后兼容）
    const db = getDatabase();
    if (DB_TYPE === 'postgres') {
      console.log('📊 Database type: PostgreSQL');
      await runPostgresMigrations(db as Pool);
    } else {
      console.log('📊 Database type: SQLite');
      await runSqliteMigrations(db as sqlite3.Database);
    }
  }
  
  console.log('\n✨ All migrations completed!');
  process.exit(0);
}

// 运行迁移
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Migration error:', error);
    process.exit(1);
  });
}

export { main as runMigrations };


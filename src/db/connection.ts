/**
 * 数据库连接管理
 * 支持 SQLite (本地开发) 和 PostgreSQL (生产环境/Railway)
 */
import sqlite3 from 'sqlite3';
import { Pool, Client } from 'pg';
import path from 'path';
import fs from 'fs';
import { API_CONFIG } from '../api/config';

// 数据库类型
export type DatabaseType = 'sqlite' | 'postgresql';

// 检测数据库类型
function getDatabaseType(): DatabaseType {
  if (API_CONFIG.DATABASE_URL && API_CONFIG.DATABASE_URL.startsWith('postgres')) {
    return 'postgresql';
  }
  return 'sqlite';
}

export const DB_TYPE = getDatabaseType();

// SQLite 连接
let sqliteDb: sqlite3.Database | null = null;

// PostgreSQL 连接池
let pgPool: Pool | null = null;

/**
 * 创建 SQLite 数据库连接
 */
function createSQLiteDatabase(): sqlite3.Database {
  const dbPath = API_CONFIG.DATABASE_PATH || './data/cat_indexer.db';
  
  // 确保数据目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err);
      throw err;
    }
    console.log(`✅ Connected to SQLite database: ${dbPath}`);
  });
  
  return db;
}

/**
 * 创建 PostgreSQL 连接池
 */
function createPostgreSQLPool(): Pool {
  if (!API_CONFIG.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for PostgreSQL');
  }

  const pool = new Pool({
    connectionString: API_CONFIG.DATABASE_URL,
    // Railway PostgreSQL 连接配置
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  console.log('✅ Connected to PostgreSQL database');
  return pool;
}

/**
 * 获取数据库连接
 * 根据 DATABASE_URL 自动选择 SQLite 或 PostgreSQL
 */
export function getDatabase(): sqlite3.Database | Pool {
  if (DB_TYPE === 'postgresql') {
    if (!pgPool) {
      pgPool = createPostgreSQLPool();
    }
    return pgPool;
  } else {
    if (!sqliteDb) {
      sqliteDb = createSQLiteDatabase();
    }
    return sqliteDb;
  }
}

/**
 * 创建数据库连接（向后兼容）
 */
export function createDatabase(): sqlite3.Database {
  if (DB_TYPE === 'postgresql') {
    throw new Error('PostgreSQL mode: Use getDatabase() instead of createDatabase()');
  }
  if (!sqliteDb) {
    sqliteDb = createSQLiteDatabase();
  }
  return sqliteDb;
}

/**
 * 获取数据库路径（仅 SQLite）
 */
export function getDatabasePath(): string {
  return API_CONFIG.DATABASE_PATH || './data/cat_indexer.db';
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (DB_TYPE === 'postgresql') {
    if (pgPool) {
      await pgPool.end();
      pgPool = null;
      console.log('✅ PostgreSQL connection pool closed');
    }
  } else {
    if (sqliteDb) {
      return new Promise((resolve, reject) => {
        sqliteDb!.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ SQLite database closed');
            sqliteDb = null;
            resolve();
          }
        });
      });
    }
  }
}

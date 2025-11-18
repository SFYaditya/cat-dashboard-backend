/**
 * PostgreSQL 适配层
 * 将 SQLite 风格的查询转换为 PostgreSQL 兼容的查询
 * 
 * 注意：当前实现保持 SQLite 兼容性
 * 如需完全迁移到 PostgreSQL，需要：
 * 1. 将所有查询函数改为使用 pg Pool
 * 2. 将 SQLite 特定语法改为 PostgreSQL 语法
 * 3. 处理数据类型差异（TEXT -> VARCHAR/TEXT, INTEGER -> BIGINT 等）
 */

import { Pool } from 'pg';

/**
 * PostgreSQL 查询适配器
 * 提供与 SQLite 兼容的查询接口
 */
export class PGAdapter {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 执行查询（返回多行）
   */
  async all<T = any>(query: string, params: any[] = []): Promise<T[]> {
    // 转换 SQLite 占位符 ? 为 PostgreSQL 占位符 $1, $2, ...
    const pgQuery = this.convertQuery(query, params);
    const result = await this.pool.query(pgQuery.query, pgQuery.params);
    return result.rows;
  }

  /**
   * 执行查询（返回单行）
   */
  async get<T = any>(query: string, params: any[] = []): Promise<T | undefined> {
    const pgQuery = this.convertQuery(query, params);
    const result = await this.pool.query(pgQuery.query, pgQuery.params);
    return result.rows[0];
  }

  /**
   * 执行更新/插入/删除
   */
  async run(query: string, params: any[] = []): Promise<{ lastID?: number; changes: number }> {
    const pgQuery = this.convertQuery(query, params);
    const result = await this.pool.query(pgQuery.query, pgQuery.params);
    return {
      changes: result.rowCount || 0,
      // PostgreSQL 使用 RETURNING 获取插入的 ID
      lastID: result.rows[0]?.id
    };
  }

  /**
   * 转换 SQLite 查询为 PostgreSQL 查询
   */
  private convertQuery(query: string, params: any[]): { query: string; params: any[] } {
    let pgQuery = query;
    const pgParams: any[] = [];
    let paramIndex = 1;

    // 替换 ? 占位符为 $1, $2, ...
    pgQuery = pgQuery.replace(/\?/g, () => {
      pgParams.push(params[paramIndex - 1]);
      return `$${paramIndex++}`;
    });

    // SQLite 特定语法转换
    // INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY
    pgQuery = pgQuery.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
    
    // strftime('%s', 'now') -> EXTRACT(EPOCH FROM NOW())
    pgQuery = pgQuery.replace(/strftime\('%s',\s*'now'\)/gi, "EXTRACT(EPOCH FROM NOW())::INTEGER");
    
    // INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING
    pgQuery = pgQuery.replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO');
    // 需要在表定义中添加 UNIQUE 约束才能使用 ON CONFLICT
    
    // INSERT OR REPLACE -> INSERT ... ON CONFLICT DO UPDATE
    pgQuery = pgQuery.replace(/INSERT OR REPLACE INTO/g, 'INSERT INTO');
    
    return { query: pgQuery, params: pgParams };
  }
}


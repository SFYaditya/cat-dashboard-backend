/**
 * Daily Stats 相关查询（24小时统计等）
 * 优化：将统计相关查询独立成模块
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

/**
 * 24小时统计数据
 */
export interface Stats24H {
  volume_usd: string;
  swaps_count: number;
  unique_traders: number;
}

/**
 * 获取24小时内的统计数据
 * 优化：单一职责，只负责24小时统计查询，优化计算性能
 */
export async function get24HStats(db: sqlite3.Database): Promise<Stats24H> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const now = Math.floor(Date.now() / 1000);
  const day24Ago = now - 24 * 60 * 60;

  // 优化：使用 SQL 聚合函数计算，减少内存占用
  const result = await all(
    `SELECT 
       SUM(CAST(amount_usd AS REAL)) as volume_usd,
       COUNT(*) as swaps_count,
       COUNT(DISTINCT trader_address) as unique_traders
     FROM cat_swaps 
     WHERE block_time >= ? AND amount_usd IS NOT NULL`,
    [day24Ago]
  ) as Array<{
    volume_usd: number | null;
    swaps_count: number;
    unique_traders: number;
  }>;

  const stats = result[0] || { volume_usd: null, swaps_count: 0, unique_traders: 0 };

  return {
    volume_usd: (stats.volume_usd || 0).toFixed(6),
    swaps_count: stats.swaps_count,
    unique_traders: stats.unique_traders
  };
}


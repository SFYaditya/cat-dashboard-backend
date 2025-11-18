/**
 * Sync State 相关查询
 * 负责同步状态的读取和更新
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { SyncState } from '../types';

/**
 * 获取同步状态
 */
export async function getSyncState(db: sqlite3.Database): Promise<SyncState | null> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const result = await get(
    'SELECT last_block, start_block FROM sync_state WHERE key = ?',
    ['cat_indexer']
  ) as SyncState | undefined;
  return result || null;
}

/**
 * 更新同步状态
 */
export async function updateSyncState(
  db: sqlite3.Database,
  lastBlock: number,
  startBlock?: number
): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  if (startBlock !== undefined) {
    await run(
      'UPDATE sync_state SET last_block = ?, start_block = ?, updated_at = strftime("%s", "now") WHERE key = ?',
      [lastBlock, startBlock, 'cat_indexer']
    );
  } else {
    await run(
      'UPDATE sync_state SET last_block = ?, updated_at = strftime("%s", "now") WHERE key = ?',
      [lastBlock, 'cat_indexer']
    );
  }
}


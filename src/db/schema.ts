/**
 * Database 主类
 * 组合所有查询模块，提供统一的数据库访问接口
 * 支持 SQLite 和 PostgreSQL
 */
import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import { getDatabase, DB_TYPE, closeDatabase as closeDbConnection } from './connection';
import { runMigrations } from './migrations';
import * as syncQueries from './queries/sync.queries';
import * as transferQueries from './queries/transfers.queries';
import * as swapQueries from './queries/swaps.queries';
import * as holderQueries from './queries/holders.queries';
import * as addressQueries from './queries/addresses.queries';
import * as klineQueries from './queries/kline.queries';
import * as dailyQueries from './queries/daily.queries';
import * as pnlQueries from './queries/pnl.queries';
import * as lpQueries from './queries/lp.queries';
import * as tradingRankingsQueries from './queries/trading-rankings.queries';
import {
  SyncState,
  TransferData,
  SwapData,
  SwapUpdateData,
  SwapsFilterParams,
  TransfersFilterParams,
  TransferSummary,
  TransferGraph,
  DailyTransferSummary,
  KlineData,
  KlineQueryParams,
  DailyMetricsData,
  DailyTradeStatsData,
  AddressStatsData,
  AddressRoundData,
  PnlDailyData
} from './types';

export class Database {
  private _db: sqlite3.Database | Pool;

  constructor() {
    this._db = getDatabase();
    // 运行迁移（仅 SQLite，PostgreSQL 需要手动迁移）
    if (DB_TYPE === 'sqlite') {
      runMigrations(this._db as sqlite3.Database);
    }
  }

  /**
   * 获取数据库实例（SQLite 或 PostgreSQL）
   */
  get db(): sqlite3.Database | Pool {
    return this._db;
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    await closeDbConnection();
  }

  // ========== Sync State 相关方法 ==========
  async getSyncState(): Promise<SyncState | null> {
    if (DB_TYPE === 'postgresql') {
      throw new Error('PostgreSQL not fully supported yet. Please use SQLite for now.');
    }
    return syncQueries.getSyncState(this._db as sqlite3.Database);
  }

  async updateSyncState(lastBlock: number, startBlock?: number): Promise<void> {
    if (DB_TYPE === 'postgresql') {
      throw new Error('PostgreSQL not fully supported yet. Please use SQLite for now.');
    }
    return syncQueries.updateSyncState(this._db as sqlite3.Database, lastBlock, startBlock);
  }

  // ========== Transfer 相关方法 ==========
  async insertTransfer(data: TransferData): Promise<void> {
    if (DB_TYPE === 'postgresql') {
      throw new Error('PostgreSQL not fully supported yet. Please use SQLite for now.');
    }
    return transferQueries.insertTransfer(this._db as sqlite3.Database, data);
  }

  async getTransfersWithFilters(params: TransfersFilterParams): Promise<{ transfers: any[]; total: number }> {
    if (DB_TYPE === 'postgresql') {
      throw new Error('PostgreSQL not fully supported yet. Please use SQLite for now.');
    }
    return transferQueries.getTransfersWithFilters(this._db as sqlite3.Database, params);
  }

  async getLatestTransfers(limit: number = 20): Promise<any[]> {
    if (DB_TYPE === 'postgresql') {
      throw new Error('PostgreSQL not fully supported yet. Please use SQLite for now.');
    }
    return transferQueries.getLatestTransfers(this._db as sqlite3.Database, limit);
  }

  async getAddressTransferSummary(address: string): Promise<TransferSummary> {
    if (DB_TYPE === 'postgresql') {
      throw new Error('PostgreSQL not fully supported yet. Please use SQLite for now.');
    }
    return transferQueries.getAddressTransferSummary(this._db as sqlite3.Database, address);
  }

  async getAddressTransferGraph(address: string, limit: number = 20): Promise<TransferGraph> {
    if (DB_TYPE === 'postgresql') {
      throw new Error('PostgreSQL not fully supported yet. Please use SQLite for now.');
    }
    return transferQueries.getAddressTransferGraph(this._db as sqlite3.Database, address, limit);
  }

  async getDailyTransferSummary(date: string): Promise<DailyTransferSummary | null> {
    if (DB_TYPE === 'postgresql') {
      throw new Error('PostgreSQL not fully supported yet. Please use SQLite for now.');
    }
    return transferQueries.getDailyTransferSummary(this._db as sqlite3.Database, date);
  }

  // ========== Swap 相关方法 ==========
  async insertSwap(data: SwapData): Promise<void> {
    return swapQueries.insertSwap(this._db as sqlite3.Database, data);
  }

  async updateSwap(data: SwapUpdateData): Promise<void> {
    return swapQueries.updateSwap(this._db as sqlite3.Database, data);
  }

  async getSwapsNeedingBackfill(limit: number = 100): Promise<any[]> {
    return swapQueries.getSwapsNeedingBackfill(this._db as sqlite3.Database, limit);
  }

  async getSwapSummary(limit: number = 100): Promise<any> {
    return swapQueries.getSwapSummary(this._db as sqlite3.Database, limit);
  }

  async getLatestSwaps(limit: number = 20): Promise<any[]> {
    return swapQueries.getLatestSwaps(this._db as sqlite3.Database, limit);
  }

  async getAddressSwaps(address: string): Promise<any[]> {
    return swapQueries.getAddressSwaps(this._db as sqlite3.Database, address);
  }

  async getSwapsWithFilters(params: SwapsFilterParams): Promise<{ swaps: any[]; total: number }> {
    return swapQueries.getSwapsWithFilters(this._db as sqlite3.Database, params);
  }

  async getSwapsForKline(startTime?: number, endTime?: number): Promise<any[]> {
    return swapQueries.getSwapsForKline(this._db as sqlite3.Database, startTime, endTime);
  }

  async getLatestPrice(): Promise<string | null> {
    return swapQueries.getLatestPrice(this._db as sqlite3.Database);
  }

  async getCurrentPrice(): Promise<string | null> {
    return swapQueries.getCurrentPrice(this._db as sqlite3.Database);
  }

  async getSwapsByTimeRange(startTime: number, endTime: number): Promise<any[]> {
    return dailyQueries.getSwapsByTimeRange(this._db as sqlite3.Database, startTime, endTime);
  }

  // ========== Holder 相关方法 ==========
  async updateHolderBalance(address: string, delta: string, operation: 'add' | 'subtract'): Promise<void> {
    return holderQueries.updateHolderBalance(this._db as sqlite3.Database, address, delta, operation);
  }

  async getHolderBalance(address: string): Promise<{ balance_cat: string } | null> {
    return holderQueries.getHolderBalance(this._db as sqlite3.Database, address);
  }

  async getLatestChainBalance(address: string): Promise<{ balance_cat_after: string; balance_usdt_after: string } | null> {
    return holderQueries.getLatestChainBalance(this._db as sqlite3.Database, address);
  }

  async getCurrentHoldersCount(): Promise<number> {
    return holderQueries.getCurrentHoldersCount(this._db as sqlite3.Database);
  }

  async getHoldersCountForDay(day: string): Promise<number> {
    return holderQueries.getHoldersCountForDay(this._db as sqlite3.Database, day);
  }

  async saveDailyHoldersSnapshot(day: string): Promise<void> {
    return holderQueries.saveDailyHoldersSnapshot(this._db as sqlite3.Database, day);
  }

  async getOpenHoldersCount(day: string): Promise<number | null> {
    return holderQueries.getOpenHoldersCount(this._db as sqlite3.Database, day);
  }

  // ========== Address 相关方法 ==========
  async getAddressLabel(address: string): Promise<any | null> {
    return addressQueries.getAddressLabel(this._db as sqlite3.Database, address);
  }

  async upsertAddressStats(data: AddressStatsData): Promise<void> {
    return addressQueries.upsertAddressStats(this._db as sqlite3.Database, data);
  }

  async getAddressStats(address: string): Promise<any | null> {
    return addressQueries.getAddressStats(this._db as sqlite3.Database, address);
  }

  async insertAddressRound(data: AddressRoundData): Promise<void> {
    return addressQueries.insertAddressRound(this._db as sqlite3.Database, data);
  }

  async getAddressRounds(address: string): Promise<any[]> {
    return addressQueries.getAddressRounds(this._db as sqlite3.Database, address);
  }

  async getAllTradingAddresses(): Promise<string[]> {
    return addressQueries.getAllTradingAddresses(this._db as sqlite3.Database);
  }

  async getAllTraderAddresses(): Promise<string[]> {
    return addressQueries.getAllTraderAddresses(this._db as sqlite3.Database);
  }

  async getAddressLast7DStats(address: string): Promise<{
    volume_usd: string;
    trades: number;
  }> {
    return addressQueries.getAddressLast7DStats(this._db as sqlite3.Database, address);
  }

  // ========== Kline 相关方法 ==========
  async upsertKline(data: KlineData): Promise<void> {
    return klineQueries.upsertKline(this._db as sqlite3.Database, data);
  }

  async getKlines(params: KlineQueryParams): Promise<any[]> {
    return klineQueries.getKlines(this._db as sqlite3.Database, params);
  }

  async getLatestPriceForOverview(): Promise<string | null> {
    return klineQueries.getLatestPriceForOverview(this._db as sqlite3.Database);
  }

  // ========== Daily Metrics 相关方法 ==========
  async upsertDailyMetrics(data: DailyMetricsData): Promise<void> {
    return dailyQueries.upsertDailyMetrics(this._db as sqlite3.Database, data);
  }

  async getDailyMetrics(startDay?: string, endDay?: string): Promise<any[]> {
    return dailyQueries.getDailyMetrics(this._db as sqlite3.Database, startDay, endDay);
  }

  async getUniqueTradersForDay(dayStart: number, dayEnd: number): Promise<number> {
    return dailyQueries.getUniqueTradersForDay(this._db as sqlite3.Database, dayStart, dayEnd);
  }

  // ========== Daily Trade Stats 相关方法 ==========
  async upsertDailyTradeStats(date: string, data: DailyTradeStatsData): Promise<void> {
    return dailyQueries.upsertDailyTradeStats(this._db as sqlite3.Database, date, data);
  }

  async getDailyTradeStats(startDate?: string, endDate?: string): Promise<Array<DailyTradeStatsData>> {
    return dailyQueries.getDailyTradeStats(this._db as sqlite3.Database, startDate, endDate);
  }

  async incrementDailyTradeStats(
    dateStr: string,
    traderAddress: string,
    side: 'buy' | 'sell',
    amountCat: string
  ): Promise<void> {
    return dailyQueries.incrementDailyTradeStats(this._db as sqlite3.Database, dateStr, traderAddress, side, amountCat);
  }

  async hasDailyTradeStats(date: string): Promise<boolean> {
    return dailyQueries.hasDailyTradeStats(this._db as sqlite3.Database, date);
  }

  async getOpenPrice(day: string): Promise<string | null> {
    return dailyQueries.getOpenPrice(this._db as sqlite3.Database, day);
  }

  async getFirstSwapOfDay(day: string): Promise<{ block_number: number; block_time: number } | null> {
    return dailyQueries.getFirstSwapOfDay(this._db as sqlite3.Database, day);
  }

  async getLastProcessedSwapId(): Promise<number> {
    return dailyQueries.getLastProcessedSwapId(this._db as sqlite3.Database);
  }

  async updateLastProcessedSwapId(swapId: number): Promise<void> {
    // 这个方法在原始代码中使用 sync_state 表存储，但逻辑上应该属于 daily 查询
    // 为了保持兼容性，暂时保留在这里，可以后续移到 daily.queries.ts
    // 注意：这个方法只支持 SQLite，PostgreSQL 需要不同的实现
    if (DB_TYPE === 'postgresql') {
      // PostgreSQL 实现（如果需要）
      throw new Error('updateLastProcessedSwapId not implemented for PostgreSQL');
    }
    const { promisify } = await import('util');
    const sqliteDb = this._db as sqlite3.Database;
    const run = promisify(sqliteDb.run.bind(sqliteDb)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
    await run(
      `INSERT OR REPLACE INTO sync_state (key, last_block, updated_at)
       VALUES ('pnl_last_swap_id', ?, strftime('%s', 'now'))`,
      [swapId]
    );
  }

  async getSwapsAfterId(swapId: number): Promise<any[]> {
    return dailyQueries.getSwapsAfterId(this._db as sqlite3.Database, swapId);
  }

  async getPrice24HAgo(): Promise<string | null> {
    return dailyQueries.getPrice24HAgo(this._db as sqlite3.Database);
  }

  async get24HStats(): Promise<{
    volume_usd: string;
    swaps_count: number;
    unique_traders: number;
  }> {
    return dailyQueries.get24HStats(this._db as sqlite3.Database);
  }

  // ========== PnL 相关方法 ==========
  async upsertPnlDaily(address: string, date: string, data: Omit<PnlDailyData, 'address' | 'date'>): Promise<void> {
    return pnlQueries.upsertPnlDaily(this._db as sqlite3.Database, address, date, data);
  }

  async getAddressPnlHistory(address: string, days: number = 30): Promise<any[]> {
    return pnlQueries.getAddressPnlHistory(this._db as sqlite3.Database, address, days);
  }

  async getAddressPnlSummary(address: string): Promise<any> {
    return pnlQueries.getAddressPnlSummary(this._db as sqlite3.Database, address);
  }

  // ========== LP 快照相关方法 ==========
  async getLpSnapshot(date: string): Promise<{
    date: string;
    block_number: number;
    block_time: number;
    lp_value_usd: string;
    cat_amount: string;
    usdt_amount: string;
    snapshot_type: string;
  } | null> {
    return lpQueries.getLpSnapshot(this._db as sqlite3.Database, date);
  }

  async upsertLpSnapshot(data: {
    date: string;
    block_number: number;
    block_time: number;
    lp_value_usd: string;
    cat_amount: string;
    usdt_amount: string;
    snapshot_type?: string;
  }): Promise<void> {
    return lpQueries.upsertLpSnapshot(this._db as sqlite3.Database, data);
  }

  // ========== 交易排行榜相关方法 ==========
  async getBuyVolumeTop(limit: number = 50, startTime?: number, endTime?: number) {
    return tradingRankingsQueries.getBuyVolumeTop(this._db as sqlite3.Database, limit, startTime, endTime);
  }

  async getSellVolumeTop(limit: number = 50, startTime?: number, endTime?: number) {
    return tradingRankingsQueries.getSellVolumeTop(this._db as sqlite3.Database, limit, startTime, endTime);
  }

  async getBuyCountTop(limit: number = 20, startTime?: number, endTime?: number) {
    return tradingRankingsQueries.getBuyCountTop(this._db as sqlite3.Database, limit, startTime, endTime);
  }

  async getSellCountTop(limit: number = 20, startTime?: number, endTime?: number) {
    return tradingRankingsQueries.getSellCountTop(this._db as sqlite3.Database, limit, startTime, endTime);
  }

  async getTradeCountTop(limit: number = 20, startTime?: number, endTime?: number) {
    return tradingRankingsQueries.getTradeCountTop(this._db as sqlite3.Database, limit, startTime, endTime);
  }

  async getBuySellRatio(startTime?: number, endTime?: number) {
    return tradingRankingsQueries.getBuySellRatio(this._db as sqlite3.Database, startTime, endTime);
  }

  // 暴露 db 实例（用于向后兼容，某些地方可能需要直接访问）
  // 注意：返回类型可能是 sqlite3.Database 或 Pool
  get dbInstance(): sqlite3.Database | Pool {
    return this._db;
  }
}


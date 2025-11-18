/**
 * 交易排行榜相关查询
 * 提供买入/卖出金额、次数等排行榜数据
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

/**
 * 获取买入金额TOP排行榜
 */
export async function getBuyVolumeTop(
  db: sqlite3.Database,
  limit: number = 50,
  startTime?: number,
  endTime?: number
): Promise<Array<{
  address: string;
  buy_volume_cat: string;
  buy_volume_usd: string;
  buy_count: number;
  sell_volume_cat: string;
  sell_volume_usd: string;
}>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  let query = `
    SELECT 
      address,
      buy_volume_cat,
      buy_volume_usd,
      buy_count,
      sell_volume_cat,
      sell_volume_usd
    FROM cat_address_trade_stats
    WHERE buy_volume_cat > '0'
  `;
  
  const params: any[] = [];
  
  // 时间范围筛选（基于 first_trade_at 和 last_trade_at）
  if (startTime || endTime) {
    const timeConditions: string[] = [];
    if (startTime) {
      timeConditions.push('(last_trade_at >= ? OR first_trade_at >= ?)');
      params.push(startTime, startTime);
    }
    if (endTime) {
      timeConditions.push('(first_trade_at <= ? OR last_trade_at <= ?)');
      params.push(endTime, endTime);
    }
    if (timeConditions.length > 0) {
      query += ` AND (${timeConditions.join(' AND ')})`;
    }
  }
  
  query += ` ORDER BY CAST(buy_volume_cat AS REAL) DESC LIMIT ?`;
  params.push(limit);
  
  return await all(query, params) as any[];
}

/**
 * 获取卖出金额TOP排行榜
 */
export async function getSellVolumeTop(
  db: sqlite3.Database,
  limit: number = 50,
  startTime?: number,
  endTime?: number
): Promise<Array<{
  address: string;
  sell_volume_cat: string;
  sell_volume_usd: string;
  sell_count: number;
  buy_volume_cat: string;
  buy_volume_usd: string;
}>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  let query = `
    SELECT 
      address,
      sell_volume_cat,
      sell_volume_usd,
      sell_count,
      buy_volume_cat,
      buy_volume_usd
    FROM cat_address_trade_stats
    WHERE sell_volume_cat > '0'
  `;
  
  const params: any[] = [];
  
  // 时间范围筛选
  if (startTime || endTime) {
    const timeConditions: string[] = [];
    if (startTime) {
      timeConditions.push('(last_trade_at >= ? OR first_trade_at >= ?)');
      params.push(startTime, startTime);
    }
    if (endTime) {
      timeConditions.push('(first_trade_at <= ? OR last_trade_at <= ?)');
      params.push(endTime, endTime);
    }
    if (timeConditions.length > 0) {
      query += ` AND (${timeConditions.join(' AND ')})`;
    }
  }
  
  query += ` ORDER BY CAST(sell_volume_cat AS REAL) DESC LIMIT ?`;
  params.push(limit);
  
  return await all(query, params) as any[];
}

/**
 * 获取买入次数TOP排行榜
 */
export async function getBuyCountTop(
  db: sqlite3.Database,
  limit: number = 20,
  startTime?: number,
  endTime?: number
): Promise<Array<{
  address: string;
  buy_count: number;
  buy_volume_cat: string;
  buy_volume_usd: string;
}>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  let query = `
    SELECT 
      address,
      buy_count,
      buy_volume_cat,
      buy_volume_usd
    FROM cat_address_trade_stats
    WHERE buy_count > 0
  `;
  
  const params: any[] = [];
  
  // 时间范围筛选
  if (startTime || endTime) {
    const timeConditions: string[] = [];
    if (startTime) {
      timeConditions.push('(last_trade_at >= ? OR first_trade_at >= ?)');
      params.push(startTime, startTime);
    }
    if (endTime) {
      timeConditions.push('(first_trade_at <= ? OR last_trade_at <= ?)');
      params.push(endTime, endTime);
    }
    if (timeConditions.length > 0) {
      query += ` AND (${timeConditions.join(' AND ')})`;
    }
  }
  
  query += ` ORDER BY buy_count DESC LIMIT ?`;
  params.push(limit);
  
  return await all(query, params) as any[];
}

/**
 * 获取卖出次数TOP排行榜
 */
export async function getSellCountTop(
  db: sqlite3.Database,
  limit: number = 20,
  startTime?: number,
  endTime?: number
): Promise<Array<{
  address: string;
  sell_count: number;
  sell_volume_cat: string;
  sell_volume_usd: string;
}>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  let query = `
    SELECT 
      address,
      sell_count,
      sell_volume_cat,
      sell_volume_usd
    FROM cat_address_trade_stats
    WHERE sell_count > 0
  `;
  
  const params: any[] = [];
  
  // 时间范围筛选
  if (startTime || endTime) {
    const timeConditions: string[] = [];
    if (startTime) {
      timeConditions.push('(last_trade_at >= ? OR first_trade_at >= ?)');
      params.push(startTime, startTime);
    }
    if (endTime) {
      timeConditions.push('(first_trade_at <= ? OR last_trade_at <= ?)');
      params.push(endTime, endTime);
    }
    if (timeConditions.length > 0) {
      query += ` AND (${timeConditions.join(' AND ')})`;
    }
  }
  
  query += ` ORDER BY sell_count DESC LIMIT ?`;
  params.push(limit);
  
  return await all(query, params) as any[];
}

/**
 * 获取交易次数TOP排行榜
 */
export async function getTradeCountTop(
  db: sqlite3.Database,
  limit: number = 20,
  startTime?: number,
  endTime?: number
): Promise<Array<{
  address: string;
  trade_count: number;
  buy_count: number;
  sell_count: number;
  buy_volume_cat: string;
  buy_volume_usd: string;
  sell_volume_cat: string;
  sell_volume_usd: string;
}>> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  let query = `
    SELECT 
      address,
      trade_count,
      buy_count,
      sell_count,
      buy_volume_cat,
      buy_volume_usd,
      sell_volume_cat,
      sell_volume_usd
    FROM cat_address_trade_stats
    WHERE trade_count > 0
  `;
  
  const params: any[] = [];
  
  // 时间范围筛选
  if (startTime || endTime) {
    const timeConditions: string[] = [];
    if (startTime) {
      timeConditions.push('(last_trade_at >= ? OR first_trade_at >= ?)');
      params.push(startTime, startTime);
    }
    if (endTime) {
      timeConditions.push('(first_trade_at <= ? OR last_trade_at <= ?)');
      params.push(endTime, endTime);
    }
    if (timeConditions.length > 0) {
      query += ` AND (${timeConditions.join(' AND ')})`;
    }
  }
  
  query += ` ORDER BY trade_count DESC LIMIT ?`;
  params.push(limit);
  
  return await all(query, params) as any[];
}

/**
 * 获取买卖金额占比统计
 */
export async function getBuySellRatio(
  db: sqlite3.Database,
  startTime?: number,
  endTime?: number
): Promise<{
  total_buy_volume_cat: string;
  total_sell_volume_cat: string;
  total_buy_volume_usd: string;
  total_sell_volume_usd: string;
  buy_ratio: number;
  sell_ratio: number;
  buy_address_count: number;
  sell_address_count: number;
}> {
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  
  let query = `
    SELECT 
      SUM(CAST(buy_volume_cat AS REAL)) as total_buy_volume_cat,
      SUM(CAST(sell_volume_cat AS REAL)) as total_sell_volume_cat,
      SUM(CAST(buy_volume_usd AS REAL)) as total_buy_volume_usd,
      SUM(CAST(sell_volume_usd AS REAL)) as total_sell_volume_usd,
      COUNT(DISTINCT CASE WHEN buy_volume_cat > '0' THEN address END) as buy_address_count,
      COUNT(DISTINCT CASE WHEN sell_volume_cat > '0' THEN address END) as sell_address_count
    FROM cat_address_trade_stats
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  // 时间范围筛选
  if (startTime || endTime) {
    const timeConditions: string[] = [];
    if (startTime) {
      timeConditions.push('(last_trade_at >= ? OR first_trade_at >= ?)');
      params.push(startTime, startTime);
    }
    if (endTime) {
      timeConditions.push('(first_trade_at <= ? OR last_trade_at <= ?)');
      params.push(endTime, endTime);
    }
    if (timeConditions.length > 0) {
      query += ` AND (${timeConditions.join(' AND ')})`;
    }
  }
  
  const result = await get(query, params) as any;
  
  const totalBuyCat = parseFloat(result.total_buy_volume_cat || '0');
  const totalSellCat = parseFloat(result.total_sell_volume_cat || '0');
  const totalVolume = totalBuyCat + totalSellCat;
  
  const buyRatio = totalVolume > 0 ? (totalBuyCat / totalVolume) * 100 : 0;
  const sellRatio = totalVolume > 0 ? (totalSellCat / totalVolume) * 100 : 0;
  
  return {
    total_buy_volume_cat: totalBuyCat.toFixed(6),
    total_sell_volume_cat: totalSellCat.toFixed(6),
    total_buy_volume_usd: (result.total_buy_volume_usd || '0'),
    total_sell_volume_usd: (result.total_sell_volume_usd || '0'),
    buy_ratio: buyRatio,
    sell_ratio: sellRatio,
    buy_address_count: result.buy_address_count || 0,
    sell_address_count: result.sell_address_count || 0
  };
}


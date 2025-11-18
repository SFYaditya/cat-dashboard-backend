/**
 * Overview 业务逻辑服务
 * 优化：将复杂的业务逻辑从 handler 中分离，提高可测试性和可维护性
 */

import { Database } from '../../db/schema';
import { PriceData, LpData, HoldersData, LpContractConfig } from './overview.types';
import {
  calculatePriceChange,
  createDefaultPriceData,
  createDefaultLpData,
  createDefaultHoldersData,
  calculateHoldersChange
} from './overview.utils';
import { getLpData } from './overview.lp-service';

/**
 * 获取价格数据
 * 优化：单一职责，只负责价格数据获取和计算
 */
export async function getPriceData(
  db: Database,
  today: string
): Promise<PriceData | null> {
  try {
    const openPriceStr = await db.getOpenPrice(today);
    const currentPriceStr = await db.getCurrentPrice();
    
    if (!currentPriceStr) {
      return null;
    }
    
    const currentPrice = parseFloat(currentPriceStr);
    const openPrice = openPriceStr ? parseFloat(openPriceStr) : currentPrice;
    const { changePercent, changeValue } = calculatePriceChange(currentPrice, openPrice);
    
    return {
      price_now: currentPrice,
      price_open_today: openPrice,
      change_percent: changePercent,
      change_value: changeValue
    };
  } catch (error) {
    console.error('Error fetching price data:', error);
    return null;
  }
}

/**
 * 获取持币人数数据
 * 优化：单一职责，只负责持币人数数据获取和计算
 */
export async function getHoldersData(
  db: Database,
  today: string
): Promise<HoldersData> {
  try {
    const currentHolders = await db.getCurrentHoldersCount();
    const openHolders = await db.getOpenHoldersCount(today);
    return calculateHoldersChange(currentHolders, openHolders);
  } catch (error) {
    console.error('Error fetching holders data:', error);
    return createDefaultHoldersData();
  }
}

/**
 * 获取市场概览数据
 * 优化：组合各个数据源，统一错误处理
 */
export async function getMarketOverviewData(
  db: Database,
  config: LpContractConfig
): Promise<{
  day: string;
  lastUpdated: string;
  price: PriceData;
  lp: LpData;
  holders: HoldersData;
}> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  // 并行获取数据，提高性能
  const [priceData, lpData, holdersData] = await Promise.all([
    getPriceData(db, today).catch(() => null),
    getLpData(db, config, today).catch(() => null),
    getHoldersData(db, today).catch(() => null)
  ]);
  
  return {
    day: today,
    lastUpdated: now,
    price: priceData || createDefaultPriceData(),
    lp: lpData || createDefaultLpData(),
    holders: holdersData || createDefaultHoldersData()
  };
}


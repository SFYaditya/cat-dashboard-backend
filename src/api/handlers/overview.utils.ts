/**
 * Overview 相关工具函数
 * 优化：提取可复用的计算逻辑，避免重复代码
 */

import { PriceData, LpData, HoldersData } from './overview.types';

/**
 * 计算价格变化百分比和变化值
 * 优化：单一职责，只负责价格计算逻辑
 */
export function calculatePriceChange(
  currentPrice: number,
  openPrice: number
): { changePercent: number; changeValue: number } {
  const changeValue = currentPrice - openPrice;
  const changePercent = openPrice > 0 ? (changeValue / openPrice) * 100 : 0;
  return {
    changePercent: parseFloat(changePercent.toFixed(2)),
    changeValue: parseFloat(changeValue.toFixed(6))
  };
}

/**
 * 计算24小时涨跌幅
 * 优化：提取价格变化计算逻辑
 */
export function calculate24HPriceChange(
  latestPrice: string | null,
  price24HAgo: string | null
): string {
  if (!latestPrice || !price24HAgo) {
    return '0.00';
  }
  
  const current = parseFloat(latestPrice);
  const past = parseFloat(price24HAgo);
  
  if (past <= 0) {
    return '0.00';
  }
  
  return (((current - past) / past) * 100).toFixed(2);
}

/**
 * 计算持币人数变化
 * 优化：提取持币人数计算逻辑
 */
export function calculateHoldersChange(
  currentHolders: number,
  openHolders: number | null
): HoldersData {
  if (openHolders === null) {
    return {
      currentHolders,
      openHolders: currentHolders,
      changeAbs: 0,
      changePct: 0
    };
  }
  
  const changeAbs = currentHolders - openHolders;
  const changePct = openHolders > 0 ? (changeAbs / openHolders) * 100 : 0;
  
  return {
    currentHolders,
    openHolders,
    changeAbs,
    changePct: parseFloat(changePct.toFixed(2))
  };
}

/**
 * 创建默认价格数据
 * 优化：避免重复创建默认对象
 */
export function createDefaultPriceData(): PriceData {
  return {
    price_now: 0,
    price_open_today: 0,
    change_percent: 0,
    change_value: 0
  };
}

/**
 * 创建默认 LP 数据
 * 优化：避免重复创建默认对象
 */
export function createDefaultLpData(): LpData {
  return {
    currentLpValue: 0,
    currentCatAmount: 0,
    currentUsdtAmount: 0,
    valueAtMidnight: null,
    catAtMidnight: null,
    usdtAtMidnight: null,
    deltaValue: 0,
    changePercent: 0
  };
}

/**
 * 创建默认持币人数数据
 * 优化：避免重复创建默认对象
 */
export function createDefaultHoldersData(): HoldersData {
  return {
    currentHolders: 0,
    openHolders: 0,
    changeAbs: 0,
    changePct: 0
  };
}


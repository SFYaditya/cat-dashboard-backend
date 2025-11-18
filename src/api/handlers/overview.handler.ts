/**
 * Overview 相关业务处理逻辑
 * 优化：handler 只负责请求/响应处理，业务逻辑委托给 service 层
 */
import { Request, Response } from 'express';
import { Database } from '../../db/schema';
import { errorResponse, successResponse } from '../utils';
import { calculate24HPriceChange } from './overview.utils';
import { getMarketOverviewData } from './overview.service';
import { createDefaultPriceData, createDefaultLpData, createDefaultHoldersData } from './overview.utils';
import { LpContractConfig } from './overview.types';

/**
 * 获取快速概览
 * 优化：简化逻辑，使用工具函数
 */
export async function getOverviewHandler(req: Request, res: Response, db: Database): Promise<void> {
  try {
    // 并行获取数据，提高性能
    const [latestPrice, price24HAgo, stats24h, holdersCount] = await Promise.all([
      db.getLatestPriceForOverview().catch(() => db.getLatestPrice()),
      db.getPrice24HAgo(),
      db.get24HStats(),
      db.getCurrentHoldersCount()
    ]);

    const priceChange24h = calculate24HPriceChange(latestPrice, price24HAgo);

    successResponse(res, {
      latest_price: latestPrice || '0',
      price_change_24h: priceChange24h,
      volume_24h_usd: stats24h.volume_usd,
      swaps_24h: stats24h.swaps_count,
      holders_count: holdersCount,
      unique_traders_24h: stats24h.unique_traders
    });
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取市场概览（价格、LP、持币人数）
 * 优化：将复杂逻辑委托给 service 层，handler 只负责请求/响应
 */
export async function getMarketOverviewHandler(
  req: Request,
  res: Response,
  db: Database,
  provider: any,
  lpPairAddress: string,
  catTokenAddress: string
): Promise<void> {
  try {
    const config: LpContractConfig = {
      provider,
      lpPairAddress,
      catTokenAddress
    };
    
    const data = await getMarketOverviewData(db, config);
    
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching market overview:', error);
    // 即使出错也返回基本结构，避免前端崩溃
    res.status(200).json({
      success: true,
      data: {
        day: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        price: createDefaultPriceData(),
        lp: createDefaultLpData(),
        holders: createDefaultHoldersData()
      },
      error: error?.message || 'Internal server error'
    });
  }
}

/**
 * 获取每日指标
 * 优化：简化格式化逻辑
 */
export async function getDailyMetricsHandler(req: Request, res: Response, db: Database): Promise<void> {
  try {
    const startDay = req.query.startDay as string | undefined;
    const endDay = req.query.endDay as string | undefined;

    const metrics = await db.getDailyMetrics(startDay, endDay);

    // 格式化返回数据（只选择需要的字段）
    const formatted = metrics.map(m => ({
      day: m.day,
      open_price: m.open_price,
      close_price: m.close_price,
      high_price: m.high_price,
      low_price: m.low_price,
      swaps_count: m.swaps_count,
      volume_cat: m.volume_cat,
      volume_usd: m.volume_usd,
      unique_traders: m.unique_traders,
      holders_count: m.holders_count
    }));

    successResponse(res, formatted, formatted.length);
  } catch (error) {
    errorResponse(res, error);
  }
}


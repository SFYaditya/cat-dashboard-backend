/**
 * Swaps 相关业务处理逻辑
 */
import { Request, Response } from 'express';
import { Database } from '../../db/schema';
import { SwapsQueryParams } from '../types';
import { parseTimeRange } from '../utils';
import { errorResponse, successResponse } from '../utils';

/**
 * 格式化 Swap 数据
 */
function formatSwapItem(swap: any) {
  // 优化：缓存解析结果，避免重复 JSON.parse
  let secondaryLabels: string[] = [];
  if (swap.trade_label_secondary) {
    try {
      secondaryLabels = JSON.parse(swap.trade_label_secondary);
    } catch (e) {
      secondaryLabels = swap.trade_label_secondary ? [swap.trade_label_secondary] : [];
    }
  }

  // 优化：只在需要时计算 amount_usd_abs，避免不必要的 parseFloat
  const amountUsdAbs = swap.amount_usd ? Math.abs(parseFloat(swap.amount_usd)).toFixed(6) : null;

  // 优化：简化条件判断，减少重复的 null 检查
  const snapshotCat = swap.snapshot_cat_balance ? String(swap.snapshot_cat_balance) : null;
  const snapshotUsdt = swap.snapshot_usdt_balance ? String(swap.snapshot_usdt_balance) : null;

  return {
    id: swap.id,
    block_number: swap.block_number,
    block_time: swap.block_time,
    tx_hash: swap.tx_hash,
    log_index: swap.log_index,
    trader: swap.trader_address,
    side: swap.side,
    amount_cat: swap.amount_cat,
    amount_usd: swap.amount_usd || null,
    amount_usd_abs: amountUsdAbs,
    price_usd: swap.price_usd || null,
    is_large: swap.is_large === 1,
    is_whale: swap.is_whale === 1,
    is_contract: swap.is_contract === 1 || false,
    trade_label_primary: swap.trade_label_primary || null,
    trade_label_secondary: secondaryLabels,
    snapshot_cat_balance: snapshotCat,
    snapshot_usdt_balance: snapshotUsdt,
    balance_cat_after: swap.balance_cat_after || null,
    balance_usdt_after: swap.balance_usdt_after || null,
    pair_address: swap.pair_address,
    created_at: swap.created_at
  };
}

/**
 * 获取 Swaps 列表
 */
export async function getSwapsHandler(req: Request, res: Response, db: Database): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const page = parseInt(req.query.page as string) || 1;
    const actualOffset = offset || (page - 1) * limit;

    // 解析筛选参数
    const params: SwapsQueryParams = {
      limit,
      offset: actualOffset,
      side: req.query.side as 'buy' | 'sell' | 'all' | undefined,
      minAmountUsd: req.query.minAmountUsd ? parseFloat(req.query.minAmountUsd as string) : undefined,
      maxAmountUsd: req.query.maxAmountUsd ? parseFloat(req.query.maxAmountUsd as string) : undefined,
      onlyLarge: req.query.onlyLarge === 'true',
      onlyWhale: req.query.onlyWhale === 'true',
      address: req.query.address as string | undefined,
      filterNewAddress: req.query.filterNewAddress === 'true',
      filterSwingTrader: req.query.filterSwingTrader === 'true',
      filterProfitable: req.query.filterProfitable === 'true',
      filterDeepLoss: req.query.filterDeepLoss === 'true'
    };

    // 时间范围
    const timeRange = req.query.timeRange as string | undefined;
    if (timeRange) {
      const { startTime, endTime } = parseTimeRange(timeRange);
      params.startTime = startTime;
      params.endTime = endTime;
    }

    const result = await db.getSwapsWithFilters(params);

    // 优化：使用预定义的格式化函数，减少内存分配
    const formattedSwaps = result.swaps.map(formatSwapItem);

    successResponse(res, {
      swaps: formattedSwaps,
      pagination: {
        total: result.total,
        page: page,
        pageSize: limit,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取 Swap 统计信息
 */
export async function getSwapSummaryHandler(req: Request, res: Response, db: Database): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const summary = await db.getSwapSummary(limit);
    successResponse(res, summary);
  } catch (error) {
    errorResponse(res, error);
  }
}


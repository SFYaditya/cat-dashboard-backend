/**
 * Address 相关业务处理逻辑
 */
import { Request, Response } from 'express';
import { Database } from '../../db/schema';
import { AddressStatsCalculator } from '../../addressStats';
import { responseCache } from '../cache';
import { errorResponse, successResponse } from '../utils';

/**
 * 获取地址概览
 */
export async function getAddressOverviewHandler(
  req: Request,
  res: Response,
  db: Database,
  statsCalculator: AddressStatsCalculator
): Promise<void> {
  try {
    const address = req.params.address.toLowerCase();
    const forceRecalculate = req.query.recalculate === 'true';

    // 优化：使用缓存，避免重复查询（5秒缓存）
    // 注意：对于标签相关的查询，减少缓存时间以确保标签及时更新
    const cacheKey = `address_overview_${address}`;
    if (!forceRecalculate) {
      const cached = responseCache.get<any>(cacheKey);
      if (cached) {
        return successResponse(res, cached);
      }
    }

    // 获取地址统计
    let stats = await db.getAddressStats(address);

    // 如果不存在或强制重新计算，则计算
    if (!stats || forceRecalculate) {
      stats = await statsCalculator.calculateOrUpdateAddress(address);
    }

    if (!stats) {
      // 检查是否有交易记录
      const swaps = await db.getAddressSwaps(address);
      if (swaps.length === 0) {
        return successResponse(res, {
          address: address,
          has_trades: false,
          message: 'No trades found for this address'
        });
      }
      // 有交易但统计不存在，重新计算
      stats = await statsCalculator.calculateOrUpdateAddress(address);
    }

    // 获取地址标签
    const label = await db.getAddressLabel(address);

    // 获取地址的轮回记录
    const rounds = await db.getAddressRounds(address);

    // 格式化返回数据
    const overview = {
      address: address,
      is_contract: label?.is_contract === 1 || false,
      contract_type: label?.contract_type || null,
      label: label?.label || null,
      
      // 交易统计
      trade_count: stats.trade_count || 0,
      buy_count: stats.buy_count || 0,
      sell_count: stats.sell_count || 0,
      buy_volume_cat: stats.buy_volume_cat || '0',
      buy_volume_usd: stats.buy_volume_usd || '0',
      sell_volume_cat: stats.sell_volume_cat || '0',
      sell_volume_usd: stats.sell_volume_usd || '0',
      
      // 持仓
      current_position_cat: stats.current_position_cat || '0',
      current_cost_usd: stats.current_cost_usd || '0',
      avg_buy_price: stats.avg_buy_price || null,
      
      // 盈亏
      realized_pnl_usd: stats.realized_pnl_usd || '0',
      unrealized_pnl_usd: stats.unrealized_pnl_usd || '0',
      total_pnl_usd: stats.total_pnl_usd || '0',
      roi_total: stats.roi_total || null,
      
      // 轮回统计
      profit_round_count: stats.profit_round_count || 0,
      loss_round_count: stats.loss_round_count || 0,
      current_round_pnl_usd: stats.current_round_pnl_usd || '0',
      rounds: rounds,
      
      // 时间
      first_trade_at: stats.first_trade_at || null,
      last_trade_at: stats.last_trade_at || null,
      
      // 标签（处理数字和布尔值两种情况）
      is_new_address: stats.is_new_address === 1 || stats.is_new_address === true,
      is_swing_trader: stats.is_swing_trader === 1 || stats.is_swing_trader === true,
      is_profitable_realized: stats.is_profitable_realized === 1 || stats.is_profitable_realized === true,
      is_profitable_total: stats.is_profitable_total === 1 || stats.is_profitable_total === true,
      is_deep_loss: stats.is_deep_loss === 1 || stats.is_deep_loss === true,
      last_7d_volume_usd: stats.last_7d_volume_usd || '0',
      last_7d_trades: stats.last_7d_trades || 0
    };

    // 优化：缓存结果
    responseCache.set(cacheKey, overview, 5000);
    successResponse(res, overview);
  } catch (error: any) {
    console.error('Error in getAddressOverviewHandler:', error);
    console.error('Error stack:', error?.stack);
    errorResponse(res, error);
  }
}

/**
 * 获取地址的 Swaps
 */
export async function getAddressSwapsHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const address = req.params.address.toLowerCase();
    const swaps = await db.getAddressSwaps(address);

    const formatted = swaps.map(swap => ({
      id: swap.id,
      block_number: swap.block_number,
      block_time: swap.block_time,
      tx_hash: swap.tx_hash,
      log_index: swap.log_index,
      trader: swap.trader_address,
      side: swap.side,
      amount_cat: swap.amount_cat,
      amount_usd: swap.amount_usd || null,
      price_usd: swap.price_usd || null,
      is_large: swap.is_large === 1,
      is_whale: swap.is_whale === 1,
      pair_address: swap.pair_address,
      created_at: swap.created_at
    }));

    successResponse(res, formatted, formatted.length);
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取地址的转账记录
 */
export async function getAddressTransfersHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const address = req.params.address.toLowerCase();
    const limit = parseInt(req.query.limit as string) || 100;
    
    const result = await db.getTransfersWithFilters({
      address,
      limit,
      excludeSwapRelated: false
    });

    successResponse(res, result.transfers, result.transfers.length);
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取地址转账链路图
 */
export async function getAddressTransferGraphHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const address = req.params.address.toLowerCase();
    const limit = parseInt(req.query.limit as string) || 20;
    const depth = parseInt(req.query.depth as string) || 1;

    const graph = await db.getAddressTransferGraph(address, limit);

    successResponse(res, {
      center: address,
      upstream: graph.upstream,
      downstream: graph.downstream,
      depth: depth
    });
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取地址的轮回记录
 */
export async function getAddressRoundsHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const address = req.params.address.toLowerCase();
    const rounds = await db.getAddressRounds(address);
    successResponse(res, rounds);
  } catch (error) {
    errorResponse(res, error);
  }
}


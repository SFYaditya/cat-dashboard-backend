/**
 * Stats 相关业务处理逻辑
 */
import { Request, Response } from 'express';
import { Database } from '../../db/schema';
import { AddressStatsCalculator } from '../../addressStats';
import { getTodayDate } from '../utils';
import { errorResponse, successResponse } from '../utils';

/**
 * 获取地址汇总信息
 */
export async function getAddressSummaryHandler(
  req: Request,
  res: Response,
  db: Database,
  statsCalculator: AddressStatsCalculator
): Promise<void> {
  try {
    const address = req.params.address.toLowerCase();
    let stats = await db.getAddressStats(address);
    
    // 如果统计不存在，尝试计算
    if (!stats) {
      const swaps = await db.getAddressSwaps(address);
      if (swaps.length === 0) {
        return successResponse(res, {
          address: address,
          has_trades: false,
          message: 'No trades found for this address'
        });
      }
      stats = await statsCalculator.calculateOrUpdateAddress(address);
      if (!stats) {
        return successResponse(res, {
          address: address,
          has_trades: false,
          message: 'Failed to calculate address stats'
        });
      }
    }

    // 获取地址的最新链上余额
    let balanceCat = '0';
    let balanceUsdt = '0';
    
    const latestChainBalance = await db.getLatestChainBalance(address);
    if (latestChainBalance) {
      balanceCat = latestChainBalance.balance_cat_after;
      balanceUsdt = latestChainBalance.balance_usdt_after;
    } else {
      const holder = await db.getHolderBalance(address);
      const balanceCatWei = holder ? holder.balance_cat : '0';
      balanceCat = (parseFloat(balanceCatWei) / 1e18).toString();
      
      const latestPrice = await db.getLatestPrice();
      balanceUsdt = latestPrice ? (parseFloat(balanceCat) * parseFloat(latestPrice)).toFixed(6) : '0';
    }
    
    // 获取当前价格（用于计算未实现盈亏）
    const latestPrice = await db.getLatestPrice();
    const unrealizedPnlUsd = latestPrice && stats.avg_buy_price 
      ? ((parseFloat(latestPrice) - parseFloat(stats.avg_buy_price)) * parseFloat(balanceCat)).toFixed(6)
      : '0';

    // 获取地址标签
    const label = await db.getAddressLabel(address);

    const summary = {
      address: address,
      is_contract: label?.is_contract === 1 || false,
      contract_type: label?.contract_type || null,
      label: label?.label || null,
      
      // 余额
      balance_cat: balanceCat,
      balance_usdt: balanceUsdt,
      
      // 交易统计
      total_buy_cat: stats.buy_volume_cat,
      total_buy_usd: stats.buy_volume_usd,
      total_sell_cat: stats.sell_volume_cat,
      total_sell_usd: stats.sell_volume_usd,
      buy_times: stats.buy_count,
      sell_times: stats.sell_count,
      
      // 盈亏
      realized_pnl_usd: stats.realized_pnl_usd,
      unrealized_pnl_usd: unrealizedPnlUsd,
      
      // 时间
      first_trade_time: stats.first_trade_at,
      last_trade_time: stats.last_trade_at
    };

    successResponse(res, summary);
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取地址盈亏历史
 */
export async function getAddressPnlHistoryHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const address = req.params.address.toLowerCase();
    const days = parseInt(req.query.days as string) || 30;
    
    const history = await db.getAddressPnlHistory(address, days);
    successResponse(res, history);
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取地址交易风格
 */
export async function getAddressTradeStyleHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const address = req.params.address.toLowerCase();
    const stats = await db.getAddressStats(address);
    
    if (!stats) {
      return successResponse(res, {
        address: address,
        has_trades: false,
        message: 'No stats found for this address'
      });
    }

    // 计算交易风格
    const tradeCount = stats.trade_count || 0;
    const buyCount = stats.buy_count || 0;
    const sellCount = stats.sell_count || 0;
    const isSwingTrader = stats.is_swing_trader === 1;
    const isNewAddress = stats.is_new_address === 1;
    const isProfitable = stats.is_profitable_realized === 1 || stats.is_profitable_total === 1;
    const isDeepLoss = stats.is_deep_loss === 1;

    const style = {
      address: address,
      trade_count: tradeCount,
      buy_count: buyCount,
      sell_count: sellCount,
      is_swing_trader: isSwingTrader,
      is_new_address: isNewAddress,
      is_profitable: isProfitable,
      is_deep_loss: isDeepLoss,
      trading_pattern: tradeCount === 0 ? 'no_trades' :
        buyCount === 0 ? 'seller_only' :
        sellCount === 0 ? 'buyer_only' :
        isSwingTrader ? 'swing_trader' : 'mixed'
    };

    successResponse(res, style);
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取每日交易统计
 */
export async function getDailyTradeStatsHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // 如果没有指定日期，默认返回今天的数据
    if (!startDate && !endDate) {
      const today = getTodayDate();
      const stats = await db.getDailyTradeStats(today, today);
      
      if (stats.length === 0) {
        return successResponse(res, {
          date: today,
          buy_address_count: 0,
          sell_address_count: 0,
          total_buy_cat: '0',
          total_sell_cat: '0',
          buy_tx_count: 0,
          sell_tx_count: 0,
          net_flow_cat: '0',
          unique_trader_count: 0
        });
      }

      return successResponse(res, stats[0]);
    }

    // 如果指定了日期范围，返回数组
    let actualStartDate = startDate;
    let actualEndDate = endDate;

    if (!actualEndDate) {
      actualEndDate = getTodayDate();
    }

    if (!actualStartDate) {
      const now = new Date();
      const beijingTime = new Date(now.getTime() + 8 * 3600 * 1000);
      const start = new Date(beijingTime);
      start.setUTCDate(start.getUTCDate() - 29); // 最近 30 天
      actualStartDate = 
        `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
    }

    const stats = await db.getDailyTradeStats(actualStartDate, actualEndDate);
    successResponse(res, stats);
  } catch (error) {
    errorResponse(res, error);
  }
}


/**
 * 交易排行榜相关路由
 */
import { Router } from 'express';
import { Database } from '../../db/schema';
import {
  getBuyVolumeTopHandler,
  getSellVolumeTopHandler,
  getBuyCountTopHandler,
  getSellCountTopHandler,
  getTradeCountTopHandler,
  getBuySellRatioHandler
} from '../handlers/trading-rankings.handler';

export function createTradingRankingsRoutes(db: Database): Router {
  const router = Router();

  // GET /api/cat/rankings/buy-volume - 买入金额TOP排行榜
  router.get('/buy-volume', async (req, res) => {
    await getBuyVolumeTopHandler(req, res, db);
  });

  // GET /api/cat/rankings/sell-volume - 卖出金额TOP排行榜
  router.get('/sell-volume', async (req, res) => {
    await getSellVolumeTopHandler(req, res, db);
  });

  // GET /api/cat/rankings/buy-count - 买入次数TOP排行榜
  router.get('/buy-count', async (req, res) => {
    await getBuyCountTopHandler(req, res, db);
  });

  // GET /api/cat/rankings/sell-count - 卖出次数TOP排行榜
  router.get('/sell-count', async (req, res) => {
    await getSellCountTopHandler(req, res, db);
  });

  // GET /api/cat/rankings/trade-count - 交易次数TOP排行榜
  router.get('/trade-count', async (req, res) => {
    await getTradeCountTopHandler(req, res, db);
  });

  // GET /api/cat/rankings/buy-sell-ratio - 买卖金额占比统计
  router.get('/buy-sell-ratio', async (req, res) => {
    await getBuySellRatioHandler(req, res, db);
  });

  return router;
}


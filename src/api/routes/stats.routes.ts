/**
 * Stats 相关路由
 */
import { Router } from 'express';
import { Database } from '../../db/schema';
import { getDailyTradeStatsHandler } from '../handlers/stats.handler';

export function createStatsRoutes(db: Database): Router {
  const router = Router();

  // GET /stats/daily-trades - 获取每日交易统计
  router.get('/daily-trades', async (req, res) => {
    await getDailyTradeStatsHandler(req, res, db);
  });

  return router;
}


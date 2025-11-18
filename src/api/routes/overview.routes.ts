/**
 * Overview 相关路由
 */
import { Router } from 'express';
import { Database } from '../../db/schema';
import { getOverviewHandler, getMarketOverviewHandler, getDailyMetricsHandler } from '../handlers/overview.handler';
import { API_CONFIG } from '../config';
import { ethers } from 'ethers';

export function createOverviewRoutes(db: Database): Router {
  const router = Router();
  const provider = new ethers.JsonRpcProvider(API_CONFIG.RPC_URL);

  // GET /cat/overview - 快速概览接口
  router.get('/', async (req, res) => {
    await getOverviewHandler(req, res, db);
  });

  // GET /api/cat/overview/market - 获取市场概览（价格、LP、持币人数）
  router.get('/market', async (req, res) => {
    await getMarketOverviewHandler(
      req,
      res,
      db,
      provider,
      API_CONFIG.LP_PAIR_ADDRESS,
      API_CONFIG.CAT_TOKEN_ADDRESS
    );
  });

  return router;
}

export function createDailyMetricsRoutes(db: Database): Router {
  const router = Router();

  // GET /cat/daily-metrics - 每日指标趋势接口
  router.get('/', async (req, res) => {
    await getDailyMetricsHandler(req, res, db);
  });

  return router;
}


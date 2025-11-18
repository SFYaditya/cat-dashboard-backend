/**
 * Swaps 相关路由
 */
import { Router } from 'express';
import { Database } from '../../db/schema';
import { getSwapsHandler, getSwapSummaryHandler } from '../handlers/swaps.handler';

export function createSwapsRoutes(db: Database): Router {
  const router = Router();

  // GET /cat/swaps - 获取 Swaps 列表（支持高级筛选和分页）
  router.get('/', async (req, res) => {
    await getSwapsHandler(req, res, db);
  });

  // GET /cat/swaps/summary - 获取 Swap 统计信息
  router.get('/summary', async (req, res) => {
    await getSwapSummaryHandler(req, res, db);
  });

  return router;
}


/**
 * K线相关路由
 */
import { Router } from 'express';
import { Database } from '../../db/schema';
import { getKlineHandler } from '../handlers/kline.handler';

export function createKlineRoutes(db: Database): Router {
  const router = Router();

  // GET /cat/kline - K线数据接口
  router.get('/', async (req, res) => {
    await getKlineHandler(req, res, db);
  });

  return router;
}


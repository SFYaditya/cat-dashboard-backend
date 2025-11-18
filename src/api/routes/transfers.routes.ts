/**
 * Transfers 相关路由
 */
import { Router } from 'express';
import { Database } from '../../db/schema';
import {
  getTransfersHandler,
  getAddressTransferSummaryHandler,
  getDailyTransferSummaryHandler,
  getTransfersListHandler
} from '../handlers/transfers.handler';

export function createTransfersRoutes(db: Database): Router {
  const router = Router();

  // GET /cat/transfers - 获取最新转账记录
  router.get('/', async (req, res) => {
    await getTransfersHandler(req, res, db);
  });

  // GET /api/cat/transfers/list - 获取转账记录列表（支持筛选和分页）
  router.get('/list', async (req, res) => {
    await getTransfersListHandler(req, res, db);
  });

  // GET /api/cat/transfers/address-summary - 获取地址转账汇总
  router.get('/address-summary', async (req, res) => {
    await getAddressTransferSummaryHandler(req, res, db);
  });

  // GET /api/cat/transfers/daily-summary - 获取每日转账统计
  router.get('/daily-summary', async (req, res) => {
    await getDailyTransferSummaryHandler(req, res, db);
  });

  return router;
}


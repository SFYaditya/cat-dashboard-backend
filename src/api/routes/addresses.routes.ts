/**
 * Address 相关路由
 */
import { Router } from 'express';
import { Database } from '../../db/schema';
import { AddressStatsCalculator } from '../../addressStats';
import {
  getAddressOverviewHandler,
  getAddressSwapsHandler,
  getAddressTransfersHandler,
  getAddressTransferGraphHandler
} from '../handlers/addresses.handler';
import {
  getAddressSummaryHandler,
  getAddressPnlHistoryHandler,
  getAddressTradeStyleHandler
} from '../handlers/stats.handler';

export function createAddressesRoutes(
  db: Database,
  statsCalculator: AddressStatsCalculator
): Router {
  const router = Router();

  // GET /cat/address/:address/overview - 地址画像接口
  router.get('/:address/overview', async (req, res) => {
    await getAddressOverviewHandler(req, res, db, statsCalculator);
  });

  // GET /cat/address/:address/swaps - 获取地址的 Swaps
  router.get('/:address/swaps', async (req, res) => {
    await getAddressSwapsHandler(req, res, db);
  });

  // GET /cat/address/:address/transfers - 获取地址的转账记录
  router.get('/:address/transfers', async (req, res) => {
    await getAddressTransfersHandler(req, res, db);
  });

  // GET /cat/address/:address/transfer-graph - 获取地址转账链路图
  router.get('/:address/transfer-graph', async (req, res) => {
    await getAddressTransferGraphHandler(req, res, db);
  });

  // GET /api/cat/address/:address/summary - 地址汇总信息
  router.get('/:address/summary', async (req, res) => {
    await getAddressSummaryHandler(req, res, db, statsCalculator);
  });

  // GET /api/cat/address/:address/pnl-history - 获取地址盈亏历史
  router.get('/:address/pnl-history', async (req, res) => {
    await getAddressPnlHistoryHandler(req, res, db);
  });

  // GET /api/cat/address/:address/trade-style - 获取地址交易风格
  router.get('/:address/trade-style', async (req, res) => {
    await getAddressTradeStyleHandler(req, res, db);
  });

  return router;
}


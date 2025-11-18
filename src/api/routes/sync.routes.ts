/**
 * Sync 相关路由
 */
import { Router } from 'express';
import { Database } from '../../db/schema';
import { getSyncStatusHandler } from '../handlers/sync.handler';
import { getNodeStatusHandler } from '../handlers/nodeStatus.handler';

export function createSyncRoutes(db: Database): Router {
  const router = Router();

  // GET /sync/status - 获取同步状态
  router.get('/status', async (req, res) => {
    await getSyncStatusHandler(req, res, db);
  });

  // GET /sync/node-status - 获取节点状态（延迟）
  router.get('/node-status', async (req, res) => {
    await getNodeStatusHandler(req, res);
  });

  return router;
}


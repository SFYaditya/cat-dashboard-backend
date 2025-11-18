/**
 * Express API 主文件
 * 组合所有路由和中间件
 */
import express from 'express';
import { Database } from '../db/schema';
import { AddressStatsCalculator } from '../addressStats';
// 注意：这些持续运行的任务应该在 indexer 中，不在后端 API 中
// import { TransferTypeCalculator } from '../calculateTransferType';
// import { SwapPriceCalculator } from '../calcSwapPriceAndSide';
// import { SwapLabelGenerator } from '../generateSwapLabels';
// import { SnapshotBalanceBackfill } from '../backfillSnapshotBalances';
// import { KlineAggregator } from '../klineAggregator';
// import { LpSnapshotScheduler } from '../lpSnapshotScheduler';
import { API_CONFIG } from './config';
import { createSwapsRoutes } from './routes/swaps.routes';
import { createTransfersRoutes } from './routes/transfers.routes';
import { createAddressesRoutes } from './routes/addresses.routes';
import { createKlineRoutes } from './routes/kline.routes';
import { createOverviewRoutes } from './routes/overview.routes';
import { createDailyMetricsRoutes } from './routes/overview.routes';
import { createStatsRoutes } from './routes/stats.routes';
import { createSyncRoutes } from './routes/sync.routes';
import { createTradingRankingsRoutes } from './routes/trading-rankings.routes';

const app = express();
const db = new Database();
const statsCalculator = new AddressStatsCalculator(db);
// 注意：持续运行的任务应该在 indexer 中运行，不在后端 API 中
// const transferTypeCalculator = new TransferTypeCalculator();
// const swapPriceCalculator = new SwapPriceCalculator();
// const swapLabelGenerator = new SwapLabelGenerator();
// const snapshotBalanceBackfill = new SnapshotBalanceBackfill();
// const klineAggregator = new KlineAggregator(db);
// const lpSnapshotScheduler = new LpSnapshotScheduler();

app.use(express.json());

// 注册路由
app.use('/cat/swaps', createSwapsRoutes(db));
app.use('/cat/transfers', createTransfersRoutes(db));
app.use('/cat/address', createAddressesRoutes(db, statsCalculator));
app.use('/cat/kline', createKlineRoutes(db));
app.use('/cat/overview', createOverviewRoutes(db));
app.use('/cat/daily-metrics', createDailyMetricsRoutes(db));
app.use('/api/cat/swaps', createSwapsRoutes(db));
app.use('/api/cat/transfers', createTransfersRoutes(db));
app.use('/api/cat/address', createAddressesRoutes(db, statsCalculator));
app.use('/api/cat/overview', createOverviewRoutes(db));
app.use('/api/cat/kline', createKlineRoutes(db));
app.use('/stats', createStatsRoutes(db));
app.use('/sync', createSyncRoutes(db));
app.use('/api/cat/rankings', createTradingRankingsRoutes(db));

// 兼容旧路由
app.get('/cat/holders/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const holder = await db.getHolderBalance(address);
    
    res.json({
      success: true,
      data: {
        address: address,
        balance_cat: holder?.balance_cat || '0'
      }
    });
  } catch (error) {
    console.error('Error fetching holder balance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 启动服务器
if (require.main === module) {
  app.listen(API_CONFIG.PORT, () => {
    console.log(`\n✅ API server running on http://localhost:${API_CONFIG.PORT}`);
    console.log(`\n📊 数据服务说明:`);
    console.log(`  - 后端 API 提供数据查询接口`);
    console.log(`  - 数据处理任务在 indexer 中运行`);
    console.log(`\n📡 Available endpoints:`);
    console.log(`  GET /cat/swaps?limit=20`);
    console.log(`  GET /cat/transfers?limit=20`);
    console.log(`  GET /cat/holders/:address`);
    console.log(`  GET /cat/swaps/summary?limit=100`);
    console.log(`  GET /cat/address/:address/overview`);
    console.log(`  GET /cat/kline?interval=1h&startTime=...&endTime=...`);
    console.log(`  GET /cat/daily-metrics?startDay=...&endDay=...`);
    console.log(`  GET /cat/overview`);
    console.log(`  GET /cat/address/:address/swaps`);
    console.log(`  GET /cat/address/:address/transfers`);
    console.log(`  GET /cat/address/:address/transfer-graph`);
    console.log(`  GET /api/cat/transfers/daily-summary - 每日转账统计（实时）`);
    console.log(`  GET /sync/status`);
    console.log(`  GET /health`);
    console.log(`\n`);
    
    // 注意：持续运行的任务应该在 indexer 中运行，不在后端 API 中
    // 后端 API 只负责提供数据查询接口
    console.log('\n✨ API 服务就绪！\n');
  });
}

export { app };


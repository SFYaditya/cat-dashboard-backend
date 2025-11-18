/**
 * Express API 主文件
 * 组合所有路由和中间件
 */
import express from 'express';
import { Database } from '../db/schema';
import { AddressStatsCalculator } from '../addressStats';
import { TransferTypeCalculator } from '../calculateTransferType';
import { SwapPriceCalculator } from '../calcSwapPriceAndSide';
import { SwapLabelGenerator } from '../generateSwapLabels';
import { SnapshotBalanceBackfill } from '../backfillSnapshotBalances';
import { KlineAggregator } from '../klineAggregator';
import { LpSnapshotScheduler } from '../lpSnapshotScheduler';
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
const transferTypeCalculator = new TransferTypeCalculator();
const swapPriceCalculator = new SwapPriceCalculator();
const swapLabelGenerator = new SwapLabelGenerator();
const snapshotBalanceBackfill = new SnapshotBalanceBackfill();
const klineAggregator = new KlineAggregator(db);
const lpSnapshotScheduler = new LpSnapshotScheduler();

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
    console.log(`  - 每日转账概览: 实时查询，数据自动更新`);
    console.log(`  - 前端轮询间隔: 30秒`);
    console.log(`\n🔄 持续运行任务（自动启动）:`);
    console.log(`  1. Swap 价格计算: 每 6 秒检查新记录`);
    console.log(`  2. 转账类型计算: 每 6 秒检查新记录`);
    console.log(`  3. 标签生成: 每 6 秒检查新记录`);
    console.log(`  4. 当时余额计算: 每 6 秒检查新记录`);
    console.log(`  5. K 线聚合: 每 30 秒检查新记录`);
    console.log(`  6. LP 快照定时任务: 每天 00:05（北京时间）自动创建快照`);
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
    
    // 自动启动所有持续运行任务
    console.log('🚀 启动所有持续运行任务...\n');
    
    // 启动 Swap 价格计算
    swapPriceCalculator.runContinuous(6000).catch(err => {
      console.error('Failed to start SwapPriceCalculator:', err);
    });
    console.log('✅ SwapPriceCalculator started');
    
    // 启动转账类型计算
    transferTypeCalculator.runContinuous(6000).catch(err => {
      console.error('Failed to start TransferTypeCalculator:', err);
    });
    console.log('✅ TransferTypeCalculator started');
    
    // 启动标签生成
    swapLabelGenerator.runContinuous(6000).catch(err => {
      console.error('Failed to start SwapLabelGenerator:', err);
    });
    console.log('✅ SwapLabelGenerator started');
    
    // 启动当时余额计算
    snapshotBalanceBackfill.runContinuous(6000).catch(err => {
      console.error('Failed to start SnapshotBalanceBackfill:', err);
    });
    console.log('✅ SnapshotBalanceBackfill started');
    
    // 启动 K 线聚合（每30秒检查一次，确保15分钟K线能及时更新）
    klineAggregator.runContinuous(30000).catch(err => {
      console.error('Failed to start KlineAggregator:', err);
    });
    console.log('✅ KlineAggregator started (30s interval)');
    
    // 启动 LP 快照定时任务（每天 00:05 自动创建快照）
    lpSnapshotScheduler.start();
    console.log('✅ LpSnapshotScheduler started');
    
    console.log('\n✨ 所有任务已启动，API 服务就绪！\n');
  });
}

export { app };


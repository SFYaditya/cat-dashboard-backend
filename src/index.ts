/**
 * CAT Dashboard Backend API - Main Entry Point
 */
import express from 'express';
import { Database } from './db/schema';
import { AddressStatsCalculator } from './addressStats';
import { API_CONFIG } from './api/config';
import { createSwapsRoutes } from './api/routes/swaps.routes';
import { createTransfersRoutes } from './api/routes/transfers.routes';
import { createAddressesRoutes } from './api/routes/addresses.routes';
import { createKlineRoutes } from './api/routes/kline.routes';
import { createOverviewRoutes } from './api/routes/overview.routes';
import { createStatsRoutes } from './api/routes/stats.routes';
import { createSyncRoutes } from './api/routes/sync.routes';
import { createTradingRankingsRoutes } from './api/routes/trading-rankings.routes';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const db = new Database();
const statsCalculator = new AddressStatsCalculator(db);

app.use(express.json());

// CORS middleware (if needed)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cat-dashboard-backend' });
});

// API routes (all under /api prefix)
app.use('/api/cat/swaps', createSwapsRoutes(db));
app.use('/api/cat/transfers', createTransfersRoutes(db));
app.use('/api/cat/address', createAddressesRoutes(db, statsCalculator));
app.use('/api/cat/kline', createKlineRoutes(db));
app.use('/api/cat/overview', createOverviewRoutes(db));
app.use('/api/cat/rankings', createTradingRankingsRoutes(db));
app.use('/api/stats', createStatsRoutes(db));
app.use('/api/sync', createSyncRoutes(db));

// Start server
if (require.main === module) {
  const port = API_CONFIG.PORT;
  // Railway 兼容：监听 0.0.0.0 而不是 localhost
  const host = process.env.HOST || '0.0.0.0';
  
  app.listen(port, host, () => {
    console.log(`\n✅ CAT Dashboard Backend API running on http://${host}:${port}`);
    console.log(`\n📡 Available endpoints:`);
    console.log(`  GET /health`);
    console.log(`  GET /api/cat/swaps`);
    console.log(`  GET /api/cat/transfers`);
    console.log(`  GET /api/cat/address/:address/overview`);
    console.log(`  GET /api/cat/kline`);
    console.log(`  GET /api/cat/overview/market`);
    console.log(`  GET /api/cat/rankings/*`);
    console.log(`  GET /api/sync/status`);
    console.log(`\n`);
  });
}

export { app };


# CAT Dashboard Backend

Backend API service for CAT Dashboard. Ready for Railway deployment.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Production Build

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

## 📋 Prerequisites

- Node.js >= 18.0.0
- SQLite3 (for local development) or PostgreSQL (for production)

## ⚙️ Environment Variables

### Required Variables

- `PORT` - Server port (Railway automatically provides this)
- `DATABASE_URL` - PostgreSQL connection string (for Railway)
  - OR `DATABASE_PATH` - SQLite database path (for local development)

### Optional Variables

- `RPC_HTTP` - PSC chain RPC endpoint (default: `https://psc-mainnet.polysmartchain.com`)
- `RPC_WS` - WebSocket RPC endpoint (default: `wss://psc-ws.polysmartchain.com`)
- `CAT_TOKEN_ADDRESS` - CAT token contract address
- `CAT_LP_ADDRESS` - LP pair contract address
- `CAT_ROUTER_ADDRESS` - Router contract address
- `CHAIN_ID` - Chain ID (default: 6999)

See `.env.example` for all available variables.

## 🚂 Railway Deployment

### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose this repository

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "PostgreSQL"
3. Railway will automatically create a PostgreSQL database
4. Copy the `DATABASE_URL` from the database service

### Step 3: Configure Environment Variables

In Railway project settings, add these environment variables:

```
DATABASE_URL=<from PostgreSQL service>
RPC_HTTP=https://psc-mainnet.polysmartchain.com
RPC_WS=wss://psc-ws.polysmartchain.com
CAT_TOKEN_ADDRESS=0xE6e67fc4e00AcAe886Bd17eFB78d547c434a75B5
CAT_LP_ADDRESS=0x74b585f88c7c8bd7828284bd5b325311690a111d
CAT_ROUTER_ADDRESS=0xb7EA48DD32D29037daA0482d98b36e3c0b75EA16
CHAIN_ID=6999
```

**Note**: Railway automatically provides `PORT` environment variable, no need to set it manually.

### Step 4: Deploy

1. Railway will automatically detect `package.json`
2. It will run `npm install` and `npm run build`
3. Then run `npm start`
4. Your API will be available at the Railway-provided URL

### Step 5: Run Database Migrations

After first deployment, you need to run database migrations:

```bash
# Connect to Railway CLI or use Railway's web terminal
npm run migrate
```

Or manually run migrations using Railway's database service.

## 📡 API Endpoints

All endpoints are prefixed with `/api`:

- `GET /health` - Health check
- `GET /api/cat/swaps` - Get swap records
- `GET /api/cat/transfers` - Get transfer records
- `GET /api/cat/address/:address/overview` - Get address overview
- `GET /api/cat/kline` - Get K-line data
- `GET /api/cat/overview/market` - Get market overview
- `GET /api/cat/rankings/*` - Get trading rankings
- `GET /api/sync/status` - Get sync status

## 🗄️ Database

### SQLite (Local Development)

- Database file: `./data/cat_indexer.db` (default)
- Migrations run automatically on startup
- No additional setup required

### PostgreSQL (Production/Railway)

- Uses `DATABASE_URL` environment variable
- Requires manual migration (see migration guide)
- Recommended for production deployments

## 🔧 Database Migration

### SQLite to PostgreSQL

If migrating from SQLite to PostgreSQL:

1. Export data from SQLite
2. Create PostgreSQL database
3. Run migration scripts
4. Import data

See `MIGRATION_GUIDE.md` for detailed instructions.

## 📝 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations

## 🏗️ Architecture

- `src/api/` - API routes and handlers
- `src/db/` - Database schema and queries
- `src/addressStats/` - Address statistics calculation

## 🔒 Security Notes

- Never commit `.env` file
- Use Railway's environment variables for sensitive data
- Enable HTTPS in production (Railway provides this automatically)

## 📚 Documentation

- [Railway Deployment Guide](https://docs.railway.app)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🐛 Troubleshooting

### Port Already in Use

If you see "Port already in use" error:
- Check if another process is using the port
- Change `PORT` environment variable

### Database Connection Failed

- Verify `DATABASE_URL` is correct
- Check database service is running (Railway)
- Ensure database credentials are correct

### Build Fails

- Ensure Node.js version >= 18
- Run `npm install` again
- Check TypeScript errors: `npm run build`

## 📄 License

MIT

/**
 * API 配置
 * 集中管理所有配置项
 * Railway 兼容：使用 PORT 环境变量（Railway 自动提供）
 */
import dotenv from 'dotenv';

dotenv.config();

export const API_CONFIG = {
  // Railway 使用 PORT 环境变量，如果没有则使用 API_PORT 或默认 3000
  PORT: parseInt(process.env.PORT || process.env.API_PORT || '3000', 10),
  RPC_HTTP: process.env.RPC_HTTP || process.env.RPC_URL || 'https://psc-mainnet.polysmartchain.com',
  RPC_WS: process.env.RPC_WS || 'wss://psc-ws.polysmartchain.com',
  CAT_TOKEN_ADDRESS: process.env.CAT_TOKEN_ADDRESS || '0xE6e67fc4e00AcAe886Bd17eFB78d547c434a75B5',
  CAT_LP_ADDRESS: process.env.CAT_LP_ADDRESS || process.env.LP_PAIR_ADDRESS || '0x74b585f88c7c8bd7828284bd5b325311690a111d',
  CAT_ROUTER_ADDRESS: process.env.CAT_ROUTER_ADDRESS || '0xb7EA48DD32D29037daA0482d98b36e3c0b75EA16',
  // 数据库配置
  DATABASE_URL: process.env.DATABASE_URL || '',
  // 如果使用 SQLite（本地开发）
  DATABASE_PATH: process.env.DATABASE_PATH || './data/cat_indexer.db'
} as const;


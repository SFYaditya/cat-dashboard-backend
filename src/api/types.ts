/**
 * API 相关类型定义
 */
import { Request, Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

export interface SwapsQueryParams extends PaginationParams {
  side?: 'buy' | 'sell' | 'all';
  minAmountUsd?: number;
  maxAmountUsd?: number;
  onlyLarge?: boolean;
  onlyWhale?: boolean;
  address?: string;
  filterNewAddress?: boolean;
  filterSwingTrader?: boolean;
  filterProfitable?: boolean;
  filterDeepLoss?: boolean;
  timeRange?: '1h' | '24h' | '7d';
  startTime?: number;
  endTime?: number;
}

export interface TransfersQueryParams extends PaginationParams {
  address?: string;
  direction?: 'all' | 'in' | 'out';
  minAmount?: number;
  fromTime?: string;
  toTime?: string;
  startTime?: number;
  endTime?: number;
}

export interface KlineQueryParams {
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  from?: string;
  to?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export type RouteHandler = (req: Request, res: Response) => Promise<void>;


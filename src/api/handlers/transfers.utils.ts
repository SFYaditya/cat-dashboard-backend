/**
 * Transfers 相关工具函数
 * 优化：提取重复逻辑，避免代码冗余
 */

import { TransfersQueryParams } from '../types';
import { parseTimestamp } from '../utils';

/**
 * 构建查询参数
 * 优化：统一参数解析逻辑，避免重复代码
 */
export function buildTransfersQueryParams(req: any): {
  params: TransfersQueryParams;
  pagination: { page: number; pageSize: number; offset: number };
} {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || limit;
  const actualOffset = offset || (page - 1) * limit;

  const params: TransfersQueryParams = {
    limit: pageSize,
    offset: actualOffset,
    address: req.query.address as string | undefined,
    direction: req.query.direction as 'all' | 'in' | 'out' | undefined,
    minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined
  };

  // 时间范围
  if (req.query.fromTime) {
    params.startTime = parseTimestamp(req.query.fromTime as string);
  }
  if (req.query.toTime) {
    params.endTime = parseTimestamp(req.query.toTime as string);
  }

  return {
    params,
    pagination: {
      page,
      pageSize,
      offset: actualOffset
    }
  };
}

/**
 * 获取今天日期（北京时间 UTC+8）
 * 优化：提取日期格式化逻辑，避免重复代码
 */
export function getTodayBeijingDate(): string {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 3600 * 1000);
  return `${beijingTime.getUTCFullYear()}-${String(beijingTime.getUTCMonth() + 1).padStart(2, '0')}-${String(beijingTime.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 创建分页响应
 * 优化：统一分页响应格式，避免重复代码
 */
export function createPaginationResponse(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}


/**
 * K线相关业务处理逻辑
 */
import { Request, Response } from 'express';
import { Database } from '../../db/schema';
import { KlineQueryParams } from '../types';
import { parseTimestamp } from '../utils';
import { errorResponse, successResponse } from '../utils';

/**
 * 获取 K 线数据
 */
export async function getKlineHandler(req: Request, res: Response, db: Database): Promise<void> {
  try {
    const interval = req.query.interval as string;
    if (!interval || !['1m', '5m', '15m', '1h', '4h', '1d'].includes(interval)) {
      return errorResponse(res, new Error('Invalid interval. Supported: 1m, 5m, 15m, 1h, 4h, 1d'), 400);
    }

    // 支持 from/to 参数（ISO 时间字符串或时间戳）
    // 也支持 startTime/endTime 参数（向后兼容）
    let startTime: number | undefined;
    let endTime: number | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;

    // 优先使用 from/to 参数
    if (req.query.from) {
      startTime = parseTimestamp(req.query.from as string);
    } else if (req.query.startTime) {
      startTime = parseTimestamp(req.query.startTime as string);
    }

    if (req.query.to) {
      endTime = parseTimestamp(req.query.to as string);
    } else if (req.query.endTime) {
      endTime = parseTimestamp(req.query.endTime as string);
    }

    // 如果没有指定时间范围，默认返回最新的 limit 条数据
    // 如果指定了 limit，返回最新的 limit 条；否则返回最近 7 天的数据
    let klines;
    if (!startTime && !endTime && limit) {
      // 返回最新的 limit 条数据（查询逻辑已在 getKlines 中处理）
      klines = await db.getKlines({
        interval: interval as KlineQueryParams['interval'],
        startTime: undefined,
        endTime: undefined,
        limit
      });
    } else {
      // 如果指定了时间范围，使用原来的逻辑
      if (!startTime && !endTime) {
        const now = Math.floor(Date.now() / 1000);
        startTime = now - (7 * 24 * 60 * 60); // 7 天前
        endTime = now;
      }
      klines = await db.getKlines({
        interval: interval as KlineQueryParams['interval'],
        startTime,
        endTime,
        limit
      });
    }

    // 格式化返回数据（符合前端 lightweight-charts 需要的格式）
    const candles = klines.map(k => ({
      time: k.open_time, // Unix 时间戳（秒）
      open: parseFloat(k.open_price),
      high: parseFloat(k.high_price),
      low: parseFloat(k.low_price),
      close: parseFloat(k.close_price),
      volume_cat: parseFloat(k.volume_cat)
    }));

    successResponse(res, {
      interval,
      from: startTime ? new Date(startTime * 1000).toISOString() : undefined,
      to: endTime ? new Date(endTime * 1000).toISOString() : undefined,
      candles,
      count: candles.length
    });
  } catch (error) {
    errorResponse(res, error);
  }
}


/**
 * 交易排行榜相关业务处理逻辑
 */
import { Request, Response } from 'express';
import { Database } from '../../db/schema';
import { errorResponse, successResponse, parseTimestamp } from '../utils';

/**
 * 获取买入金额TOP排行榜
 */
export async function getBuyVolumeTopHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const startTime = parseTimestamp(req.query.startTime as string);
    const endTime = parseTimestamp(req.query.endTime as string);
    
    const rankings = await db.getBuyVolumeTop(limit, startTime, endTime);
    successResponse(res, rankings, rankings.length);
  } catch (error: any) {
    console.error('Error in getBuyVolumeTopHandler:', error);
    errorResponse(res, error);
  }
}

/**
 * 获取卖出金额TOP排行榜
 */
export async function getSellVolumeTopHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const startTime = parseTimestamp(req.query.startTime as string);
    const endTime = parseTimestamp(req.query.endTime as string);
    
    const rankings = await db.getSellVolumeTop(limit, startTime, endTime);
    successResponse(res, rankings, rankings.length);
  } catch (error: any) {
    console.error('Error in getSellVolumeTopHandler:', error);
    errorResponse(res, error);
  }
}

/**
 * 获取买入次数TOP排行榜
 */
export async function getBuyCountTopHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const startTime = parseTimestamp(req.query.startTime as string);
    const endTime = parseTimestamp(req.query.endTime as string);
    
    const rankings = await db.getBuyCountTop(limit, startTime, endTime);
    successResponse(res, rankings, rankings.length);
  } catch (error: any) {
    console.error('Error in getBuyCountTopHandler:', error);
    errorResponse(res, error);
  }
}

/**
 * 获取卖出次数TOP排行榜
 */
export async function getSellCountTopHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const startTime = parseTimestamp(req.query.startTime as string);
    const endTime = parseTimestamp(req.query.endTime as string);
    
    const rankings = await db.getSellCountTop(limit, startTime, endTime);
    successResponse(res, rankings, rankings.length);
  } catch (error: any) {
    console.error('Error in getSellCountTopHandler:', error);
    errorResponse(res, error);
  }
}

/**
 * 获取交易次数TOP排行榜
 */
export async function getTradeCountTopHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const startTime = parseTimestamp(req.query.startTime as string);
    const endTime = parseTimestamp(req.query.endTime as string);
    
    const rankings = await db.getTradeCountTop(limit, startTime, endTime);
    successResponse(res, rankings, rankings.length);
  } catch (error: any) {
    console.error('Error in getTradeCountTopHandler:', error);
    errorResponse(res, error);
  }
}

/**
 * 获取买卖金额占比统计
 */
export async function getBuySellRatioHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const startTime = parseTimestamp(req.query.startTime as string);
    const endTime = parseTimestamp(req.query.endTime as string);
    
    const ratio = await db.getBuySellRatio(startTime, endTime);
    successResponse(res, ratio);
  } catch (error: any) {
    console.error('Error in getBuySellRatioHandler:', error);
    errorResponse(res, error);
  }
}


/**
 * Transfers 相关业务处理逻辑
 * 优化：提取重复逻辑到 utils，handler 只负责请求/响应处理
 */
import { Request, Response } from 'express';
import { Database } from '../../db/schema';
import { errorResponse, successResponse } from '../utils';
import { buildTransfersQueryParams, getTodayBeijingDate, createPaginationResponse } from './transfers.utils';

/**
 * 获取转账记录列表
 * 优化：使用工具函数简化代码
 */
export async function getTransfersHandler(req: Request, res: Response, db: Database): Promise<void> {
  try {
    const { params, pagination } = buildTransfersQueryParams(req);

    const result = await db.getTransfersWithFilters({
      ...params,
      excludeSwapRelated: true
    });

    successResponse(res, {
      transfers: result.transfers,
      pagination: createPaginationResponse(result.total, pagination.page, pagination.pageSize)
    });
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取地址转账汇总
 * 优化：简化参数验证逻辑
 */
export async function getAddressTransferSummaryHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const address = req.query.address as string;
    if (!address) {
      return errorResponse(res, new Error('Address parameter is required'), 400);
    }

    const summary = await db.getAddressTransferSummary(address.toLowerCase());
    successResponse(res, summary);
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取每日转账统计
 * 优化：使用工具函数获取日期
 */
export async function getDailyTransferSummaryHandler(
  req: Request,
  res: Response,
  db: Database
): Promise<void> {
  try {
    const date = (req.query.date as string) || getTodayBeijingDate();

    const summary = await db.getDailyTransferSummary(date);
    successResponse(res, summary || {
      date,
      stake_total_cat: '0.0000',
      unstake_total_cat: '0.0000',
      normal_total_cat: '0.0000'
    });
  } catch (error) {
    errorResponse(res, error);
  }
}

/**
 * 获取转账记录列表（带标签）
 * 优化：使用工具函数，优化标签获取逻辑（批量获取）
 */
export async function getTransfersListHandler(req: Request, res: Response, db: Database): Promise<void> {
  try {
    const { params, pagination } = buildTransfersQueryParams(req);

    const result = await db.getTransfersWithFilters({
      ...params,
      excludeSwapRelated: true
    });

    // 优化：批量获取地址标签，减少数据库查询次数
    const uniqueAddresses = new Set<string>();
    result.transfers.forEach(transfer => {
      uniqueAddresses.add(transfer.from_address);
      uniqueAddresses.add(transfer.to_address);
    });

    // 批量获取所有地址标签
    const labelMap = new Map<string, any>();
    await Promise.all(
      Array.from(uniqueAddresses).map(async (address) => {
        const label = await db.getAddressLabel(address);
        if (label) {
          labelMap.set(address, label);
        }
      })
    );

    // 使用缓存的标签数据
    const transfersWithLabels = result.transfers.map(transfer => {
      const fromLabel = labelMap.get(transfer.from_address);
      const toLabel = labelMap.get(transfer.to_address);
      
      return {
        time: transfer.block_time,
        from: transfer.from_address,
        to: transfer.to_address,
        amountCat: transfer.amount_cat,
        txHash: transfer.tx_hash,
        isFromContract: fromLabel?.is_contract === 1 || false,
        fromLabel: fromLabel?.label || null,
        fromContractType: fromLabel?.contract_type || null,
        isToContract: toLabel?.is_contract === 1 || false,
        toLabel: toLabel?.label || null,
        toContractType: toLabel?.contract_type || null,
        transfer_type: transfer.transfer_type || null
      };
    });

    successResponse(res, {
      transfers: transfersWithLabels,
      pagination: createPaginationResponse(result.total, pagination.page, pagination.pageSize)
    });
  } catch (error) {
    errorResponse(res, error);
  }
}


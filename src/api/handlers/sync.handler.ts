/**
 * Sync 状态相关业务处理逻辑
 */
import { Request, Response } from 'express';
import { Database } from '../../db/schema';
import { errorResponse, successResponse } from '../utils';

/**
 * 获取同步状态
 */
export async function getSyncStatusHandler(req: Request, res: Response, db: Database): Promise<void> {
  try {
    const syncState = await db.getSyncState();
    const { ethers } = await import('ethers');
    const { API_CONFIG } = await import('../config');
    const provider = new ethers.JsonRpcProvider(API_CONFIG.RPC_HTTP);
    
    let currentBlock: number | null = null;
    try {
      currentBlock = await provider.getBlockNumber();
    } catch (error) {
      console.error('Error fetching current block:', error);
    }

    if (!syncState) {
      return successResponse(res, {
        startBlock: null,
        lastSyncedBlock: 0,
        targetBlock: currentBlock,
        progress: 0,
        status: 'not_started',
        remainingBlocks: currentBlock || 0,
        syncedBlocks: 0,
        totalBlocks: currentBlock || 0
      });
    }

    const lastSyncedBlock = syncState.last_block;
    const startBlock = syncState.start_block || null;
    const targetBlock = currentBlock;

    let progress = 0;
    let status: string = 'syncing';
    let remainingBlocks = 0;
    let syncedBlocks = 0;
    let totalBlocks = 0;

    if (targetBlock !== null && startBlock !== null) {
      totalBlocks = targetBlock - startBlock + 1;
      syncedBlocks = lastSyncedBlock - startBlock + 1;
      remainingBlocks = Math.max(0, targetBlock - lastSyncedBlock);
      
      if (totalBlocks > 0) {
        progress = (syncedBlocks / totalBlocks) * 100;
      }

      if (lastSyncedBlock >= targetBlock) {
        status = 'synced';
        progress = 100;
        remainingBlocks = 0;
      } else {
        status = 'syncing';
      }
    } else if (targetBlock !== null) {
      totalBlocks = targetBlock;
      syncedBlocks = lastSyncedBlock;
      remainingBlocks = Math.max(0, targetBlock - lastSyncedBlock);
      
      if (totalBlocks > 0) {
        progress = (syncedBlocks / totalBlocks) * 100;
      }

      if (lastSyncedBlock >= targetBlock) {
        status = 'synced';
        progress = 100;
        remainingBlocks = 0;
      } else {
        status = 'syncing';
      }
    } else {
      status = 'error';
    }

    const response = {
      success: true,
      data: {
        startBlock: startBlock,
        lastSyncedBlock: lastSyncedBlock,
        targetBlock: targetBlock,
        progress: parseFloat(progress.toFixed(2)),
        status: status,
        remainingBlocks: remainingBlocks,
        syncedBlocks: syncedBlocks,
        totalBlocks: totalBlocks
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    // 即使出错也返回基本结构，避免前端崩溃
    res.status(200).json({
      success: true,
      data: {
        startBlock: null,
        lastSyncedBlock: 0,
        targetBlock: null,
        progress: 0,
        status: 'error',
        remainingBlocks: 0,
        syncedBlocks: 0,
        totalBlocks: 0,
        error: error?.message || 'Internal server error'
      }
    });
  }
}


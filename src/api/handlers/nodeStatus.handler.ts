/**
 * 节点状态相关业务处理逻辑
 */
import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils';
import { ethers } from 'ethers';
import { API_CONFIG } from '../config';

/**
 * 获取节点状态（延迟）
 */
export async function getNodeStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const provider = new ethers.JsonRpcProvider(API_CONFIG.RPC_HTTP);
    
    // 测量延迟
    const startTime = Date.now();
    let latency: number | null = null;
    let blockNumber: number | null = null;
    let status: 'online' | 'offline' | 'slow' = 'offline';
    
    try {
      blockNumber = await provider.getBlockNumber();
      const endTime = Date.now();
      latency = endTime - startTime;
      
      if (latency < 500) {
        status = 'online';
      } else if (latency < 2000) {
        status = 'slow';
      } else {
        status = 'offline';
      }
    } catch (error: any) {
      console.error('Error fetching node status:', error);
      status = 'offline';
      latency = null;
    }
    
    return successResponse(res, {
      status,
      latency,
      blockNumber,
      rpcUrl: API_CONFIG.RPC_HTTP
    });
  } catch (error: any) {
    console.error('Error in getNodeStatusHandler:', error);
    return errorResponse(res, 'Failed to fetch node status', 500);
  }
}


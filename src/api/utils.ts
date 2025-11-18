/**
 * API 工具函数
 */

/**
 * 解析时间范围参数
 */
export function parseTimeRange(timeRange?: string): { startTime?: number; endTime?: number } {
  if (!timeRange) {
    return {};
  }

  const now = Math.floor(Date.now() / 1000);
  let startTime: number | undefined;

  switch (timeRange) {
    case '1h':
      startTime = now - 3600;
      break;
    case '24h':
      startTime = now - 86400;
      break;
    case '7d':
      startTime = now - 7 * 86400;
      break;
  }

  return { startTime, endTime: now };
}

/**
 * 解析时间戳或 ISO 字符串
 */
export function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  
  const num = Number(value);
  if (!isNaN(num)) {
    return num;
  }
  
  return Math.floor(new Date(value).getTime() / 1000);
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD，北京时间）
 */
export function getTodayDate(): string {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 3600 * 1000);
  return `${beijingTime.getUTCFullYear()}-${String(beijingTime.getUTCMonth() + 1).padStart(2, '0')}-${String(beijingTime.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 格式化错误响应
 */
export function errorResponse(res: any, error: any, statusCode: number = 500): void {
  console.error('API Error:', error);
  res.status(statusCode).json({
    success: false,
    error: error?.message || 'Internal server error'
  });
}

/**
 * 格式化成功响应
 */
export function successResponse<T>(res: any, data: T, count?: number): void {
  const response: any = {
    success: true,
    data
  };
  if (count !== undefined) {
    response.count = count;
  }
  res.json(response);
}


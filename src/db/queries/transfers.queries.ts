/**
 * Transfer 相关查询
 * 负责 Transfer 记录的 CRUD 操作和复杂查询
 */
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { TransferData, TransfersFilterParams, TransferSummary, TransferGraph, DailyTransferSummary } from '../types';

/**
 * 插入 Transfer 记录
 */
export async function insertTransfer(db: sqlite3.Database, data: TransferData): Promise<void> {
  const run = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  await run(
    `INSERT OR IGNORE INTO cat_transfers 
     (block_number, block_time, tx_hash, log_index, from_address, to_address, amount_cat, is_swap_related)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.block_number,
      data.block_time,
      data.tx_hash,
      data.log_index,
      data.from_address,
      data.to_address,
      data.amount_cat,
      data.is_swap_related ? 1 : 0
    ]
  );
}

/**
 * 获取转账记录（支持筛选和分页）
 */
export async function getTransfersWithFilters(
  db: sqlite3.Database,
  params: TransfersFilterParams
): Promise<{ transfers: any[]; total: number }> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  let query = `SELECT t.* FROM cat_transfers t`;
  const args: any[] = [];
  const conditions: string[] = [];

  // 地址筛选
  if (params.address) {
    const addr = params.address.toLowerCase();
    if (params.direction === 'in') {
      conditions.push(`t.to_address = ?`);
      args.push(addr);
    } else if (params.direction === 'out') {
      conditions.push(`t.from_address = ?`);
      args.push(addr);
    } else {
      conditions.push(`(t.from_address = ? OR t.to_address = ?)`);
      args.push(addr, addr);
    }
  }

  // 排除 Swap 相关转账
  if (params.excludeSwapRelated !== false) {
    conditions.push(`t.is_swap_related = 0`);
  }

  // 最小金额筛选
  if (params.minAmount !== undefined) {
    conditions.push(`CAST(t.amount_cat AS REAL) >= ?`);
    args.push(params.minAmount);
  }

  // 时间范围
  if (params.startTime) {
    conditions.push(`t.block_time >= ?`);
    args.push(params.startTime);
  }
  if (params.endTime) {
    conditions.push(`t.block_time <= ?`);
    args.push(params.endTime);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ` ORDER BY t.block_time DESC, t.log_index DESC`;

  // 获取总数
  const countQuery = query.replace(/SELECT t\.\* FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await all(countQuery, args) as any[];
  const total = countResult[0]?.total || 0;

  // 分页
  if (params.offset !== undefined) {
    query += ` LIMIT ? OFFSET ?`;
    args.push(params.limit || 50);
    args.push(params.offset);
  } else if (params.limit) {
    query += ` LIMIT ?`;
    args.push(params.limit);
  }

  const transfers = await all(query, args) as any[];
  return { transfers, total };
}

/**
 * 获取最新转账记录
 */
export async function getLatestTransfers(db: sqlite3.Database, limit: number = 20): Promise<any[]> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  return await all(
    `SELECT * FROM cat_transfers 
     ORDER BY block_time DESC, log_index DESC 
     LIMIT ?`,
    [limit]
  ) as any[];
}

/**
 * 获取地址转账汇总统计
 */
export async function getAddressTransferSummary(
  db: sqlite3.Database,
  address: string
): Promise<TransferSummary> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const addr = address.toLowerCase();

  const [outResult, inResult] = await Promise.all([
    all(
      `SELECT COUNT(*) as count, SUM(CAST(amount_cat AS REAL)) as total
       FROM cat_transfers
       WHERE from_address = ? AND is_swap_related = 0`,
      [addr]
    ),
    all(
      `SELECT COUNT(*) as count, SUM(CAST(amount_cat AS REAL)) as total
       FROM cat_transfers
       WHERE to_address = ? AND is_swap_related = 0`,
      [addr]
    )
  ]);

  return {
    totalOutCount: outResult[0]?.count || 0,
    totalOutAmount: outResult[0]?.total?.toString() || '0',
    totalInCount: inResult[0]?.count || 0,
    totalInAmount: inResult[0]?.total?.toString() || '0'
  };
}

/**
 * 获取地址转账链路图
 */
export async function getAddressTransferGraph(
  db: sqlite3.Database,
  address: string,
  limit: number = 20
): Promise<TransferGraph> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  const get = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const addr = address.toLowerCase();

  // 获取上游（转入）
  const upstream = await all(
    `SELECT 
       from_address as address,
       COUNT(*) as tx_count,
       SUM(CAST(amount_cat AS REAL)) as total_in_cat
     FROM cat_transfers
     WHERE to_address = ? AND is_swap_related = 0
     GROUP BY from_address
     ORDER BY tx_count DESC
     LIMIT ?`,
    [addr, limit]
  ) as Array<{ address: string; tx_count: number; total_in_cat: number }>;

  // 获取下游（转出）
  const downstream = await all(
    `SELECT 
       to_address as address,
       COUNT(*) as tx_count,
       SUM(CAST(amount_cat AS REAL)) as total_out_cat
     FROM cat_transfers
     WHERE from_address = ? AND is_swap_related = 0
     GROUP BY to_address
     ORDER BY tx_count DESC
     LIMIT ?`,
    [addr, limit]
  ) as Array<{ address: string; tx_count: number; total_out_cat: number }>;

  // 获取地址标签信息
  const getLabel = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>;
  const upstreamWithLabels = await Promise.all(
    upstream.map(async (item) => {
      const label = await getLabel('SELECT is_contract, contract_type, label FROM address_labels WHERE address = ?', [item.address]);
      return {
        address: item.address,
        total_in_cat: (item.total_in_cat / 1e18).toFixed(6),
        tx_count: item.tx_count,
        is_contract: label?.is_contract === 1 || false,
        label: label?.label || null
      };
    })
  );

  const downstreamWithLabels = await Promise.all(
    downstream.map(async (item) => {
      const label = await getLabel('SELECT is_contract, contract_type, label FROM address_labels WHERE address = ?', [item.address]);
      return {
        address: item.address,
        total_out_cat: (item.total_out_cat / 1e18).toFixed(6),
        tx_count: item.tx_count,
        is_contract: label?.is_contract === 1 || false,
        label: label?.label || null
      };
    })
  );

  return {
    center: address,
    upstream: upstreamWithLabels,
    downstream: downstreamWithLabels
  };
}

/**
 * 获取每日转账统计
 * 优化：即使 transfer_type 为 NULL，也实时计算类型（确保数据实时更新）
 * 如果是今天，查询到当前时间；否则查询到当天23:59:59
 */
export async function getDailyTransferSummary(
  db: sqlite3.Database,
  date: string
): Promise<DailyTransferSummary | null> {
  const all = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>;
  
  const startTime = Math.floor(new Date(date + 'T00:00:00+08:00').getTime() / 1000);
  // 如果是今天，查询到当前时间；否则查询到当天23:59:59
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 3600 * 1000);
  const todayStr = `${beijingTime.getUTCFullYear()}-${String(beijingTime.getUTCMonth() + 1).padStart(2, '0')}-${String(beijingTime.getUTCDate()).padStart(2, '0')}`;
  const endTime = date === todayStr 
    ? Math.floor(Date.now() / 1000)  // 今天：查询到当前时间
    : Math.floor(new Date(date + 'T23:59:59+08:00').getTime() / 1000);  // 历史日期：查询到当天23:59:59

  // 质押合约地址（与 calculateTransferType.ts 保持一致）
  const STAKING_CONTRACT_ADDRESS = '0x359a88216f0db3ae9cffef65ed0f701d20f84974'.toLowerCase();

  // 查询所有转账记录（包括 transfer_type 为 NULL 的记录）
  const transfers = await all(
    `SELECT transfer_type, amount_cat, from_address, to_address
     FROM cat_transfers
     WHERE block_time >= ? AND block_time <= ? 
       AND is_swap_related = 0`,
    [startTime, endTime]
  ) as Array<{
    transfer_type: string | null;
    amount_cat: string;
    from_address: string;
    to_address: string;
  }>;

  let stakeTotal = 0;
  let unstakeTotal = 0;
  let normalTotal = 0;

  for (const transfer of transfers) {
    const amountWei = parseFloat(transfer.amount_cat);
    const amountCat = amountWei / 1e18;

    // 如果 transfer_type 已计算，直接使用；否则实时计算
    let transferType = transfer.transfer_type;
    if (!transferType) {
      const fromAddr = transfer.from_address.toLowerCase();
      const toAddr = transfer.to_address.toLowerCase();
      
      if (toAddr === STAKING_CONTRACT_ADDRESS) {
        transferType = 'stake';
      } else if (fromAddr === STAKING_CONTRACT_ADDRESS) {
        transferType = 'unstake';
      } else {
        transferType = 'normal';
      }
    }

    if (transferType === 'stake') {
      stakeTotal += amountCat;
    } else if (transferType === 'unstake') {
      unstakeTotal += amountCat;
    } else if (transferType === 'normal') {
      normalTotal += amountCat;
    }
  }

  return {
    date,
    stake_total_cat: stakeTotal.toFixed(4),
    unstake_total_cat: unstakeTotal.toFixed(4),
    normal_total_cat: normalTotal.toFixed(4)
  };
}


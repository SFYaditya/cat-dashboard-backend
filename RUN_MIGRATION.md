# 🚀 在 Railway 上运行数据库迁移

## ⚠️ 重要提示

**迁移脚本不会自动运行**，需要手动执行！

## 📋 详细步骤

### 步骤 1: 确认环境变量已配置

1. 在 Railway 项目中，点击后端服务卡片（**不是数据库服务**）
2. 进入 **"Variables"** 标签页
3. 确认 `DATABASE_URL` 已配置
   - 应该从 PostgreSQL 服务复制
   - 格式：`postgresql://user:password@host:5432/dbname`

### 步骤 2: 打开 Railway Web Terminal

**方法 A: 通过服务日志**

1. 点击后端服务卡片
2. 进入 **"Deployments"** 标签页
3. 点击最新部署的 **"View logs"** 按钮
4. 在日志页面右上角，点击 **"Shell"** 或 **"Terminal"** 按钮

**方法 B: 通过服务设置**

1. 点击后端服务卡片
2. 进入 **"Settings"** 标签页
3. 找到 **"Shell"** 或 **"Terminal"** 选项

### 步骤 3: 运行迁移命令

在打开的终端中，运行：

```bash
npm run migrate
```

### 步骤 4: 查看迁移结果

**成功时，你会看到：**

```
🚀 Starting database migrations...

📊 Database type: PostgreSQL
✅ PostgreSQL migrations completed successfully

✨ All migrations completed!
```

**如果看到错误，常见原因：**

1. **DATABASE_URL 未配置**
   ```
   Error: Please set DATABASE_URL (for PostgreSQL) or DATABASE_PATH (for SQLite) environment variable
   ```
   **解决：** 在 Variables 标签页添加 `DATABASE_URL`

2. **数据库连接失败**
   ```
   Error: connect ECONNREFUSED
   ```
   **解决：** 检查 PostgreSQL 服务是否运行，确认 `DATABASE_URL` 正确

3. **权限错误**
   ```
   Error: permission denied
   ```
   **解决：** 确认 `DATABASE_URL` 中的用户名和密码正确

## 🔍 验证迁移成功

迁移完成后，可以通过以下方式验证：

### 方法 1: 在 Railway PostgreSQL 服务中查看

1. 点击 PostgreSQL 服务卡片
2. 进入 **"Data"** 或 **"Query"** 标签页
3. 运行查询：
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
4. 应该看到 14 个表

### 方法 2: 测试 API 端点

迁移成功后，API 应该不再返回 "table not found" 错误：

```bash
curl https://your-service.up.railway.app/health
curl https://your-service.up.railway.app/api/cat/overview/market
```

## 📊 迁移会创建的表

迁移脚本会创建以下 14 个表：

1. `sync_state` - 同步状态
2. `backfill_state` - 回填状态
3. `cat_transfers` - CAT 转账记录
4. `cat_swaps` - CAT 交易记录
5. `cat_holders` - 持币者
6. `address_labels` - 地址标签
7. `cat_address_trade_stats` - 地址交易统计
8. `cat_address_rounds` - 地址交易轮次
9. `cat_kline` - K 线数据
10. `cat_daily_metrics` - 每日指标
11. `cat_holders_daily` - 每日持币者快照
12. `address_pnl_daily` - 地址每日盈亏
13. `cat_daily_trade_stats` - 每日交易统计
14. `cat_lp_daily_snapshot` - LP 每日快照

## 🆘 需要帮助？

如果迁移失败，请提供：
1. Railway 终端中的完整错误信息
2. `DATABASE_URL` 的前几个字符（隐藏敏感信息）
3. PostgreSQL 服务的状态


# 🚀 Railway 快速部署指南

## 当前状态
✅ 代码已推送到 GitHub: https://github.com/SFYaditya/cat-dashboard-backend

## 部署步骤（5分钟完成）

### 步骤 1: 创建 Railway 项目（1分钟）

1. 访问 https://railway.app
2. 如果没有账号，点击 "Start a New Project" 注册/登录
3. 点击 **"New Project"**
4. 选择 **"Deploy from GitHub repo"**
5. 如果是第一次，会要求授权 Railway 访问 GitHub
6. 授权后，在仓库列表中找到并选择 **`cat-dashboard-backend`**
7. Railway 会自动开始部署

### 步骤 2: 添加 PostgreSQL 数据库（1分钟）

1. 在 Railway 项目中，点击 **"New"** 按钮（左上角）
2. 选择 **"PostgreSQL"**
3. 等待数据库创建完成（约 30 秒）
4. 点击数据库服务卡片
5. 进入 **"Variables"** 标签页
6. 找到 `DATABASE_URL`，点击复制按钮复制完整的 URL
   - 格式类似：`postgresql://postgres:password@host:5432/railway`

### 步骤 3: 配置后端服务环境变量（2分钟）

1. 回到项目主页面
2. 点击后端服务卡片（不是数据库服务）
3. 进入 **"Variables"** 标签页
4. 点击 **"New Variable"** 添加以下变量：

#### 必需变量：
```
DATABASE_URL=<从步骤 2 复制的 PostgreSQL URL>
```

#### 可选变量（有默认值，可以不设置）：
```
RPC_HTTP=https://psc-mainnet.polysmartchain.com
RPC_WS=wss://psc-ws.polysmartchain.com
CAT_TOKEN_ADDRESS=0xE6e67fc4e00AcAe886Bd17eFB78d547c434a75B5
CAT_LP_ADDRESS=0x74b585f88c7c8bd7828284bd5b325311690a111d
CAT_ROUTER_ADDRESS=0xb7EA48DD32D29037daA0482d98b36e3c0b75EA16
CHAIN_ID=6999
```

**重要提示**：
- Railway 会自动提供 `PORT` 环境变量，**不要手动设置**
- 确保 `DATABASE_URL` 是从 PostgreSQL 服务复制的，不是自己写的

### 步骤 4: 等待部署完成（1分钟）

1. 添加环境变量后，Railway 会自动重新部署
2. 进入 **"Deployments"** 标签页查看部署进度
3. 等待状态变为 **"Active"**（绿色）

### 步骤 5: 获取服务 URL 并验证（1分钟）

1. 部署完成后，在服务卡片上会显示一个 URL
2. 点击 URL 旁边的复制按钮，或进入 **"Settings"** → **"Networking"** 查看
3. 访问健康检查端点验证：
   ```
   https://your-service.up.railway.app/health
   ```
   应该返回：
   ```json
   {
     "status": "ok",
     "service": "cat-dashboard-backend"
   }
   ```

4. 测试 API 端点：
   ```
   https://your-service.up.railway.app/api/cat/overview/market
   ```

## ✅ 部署完成检查清单

- [ ] Railway 项目已创建
- [ ] GitHub 仓库已连接
- [ ] PostgreSQL 数据库已添加
- [ ] `DATABASE_URL` 环境变量已配置
- [ ] 部署状态为 "Active"（绿色）
- [ ] `/health` 端点返回正常
- [ ] API 端点可以访问

## 🔗 下一步

部署完成后，将后端 URL 配置到前端：

1. 复制后端 URL（例如：`https://cat-dashboard-backend-production.up.railway.app`）
2. 在前端仓库的 Vercel 环境变量中设置：
   ```
   VITE_API_BASE_URL=https://cat-dashboard-backend-production.up.railway.app
   ```

## 🐛 常见问题

### 部署失败
- 检查构建日志中的错误
- 确保 `package.json` 中有 `build` 和 `start` 脚本
- 检查 Node.js 版本（需要 >= 18）

### 数据库连接失败
- 确认 `DATABASE_URL` 是从 PostgreSQL 服务复制的
- 检查数据库服务是否正常运行
- 查看服务日志中的错误信息

### API 返回 500 错误
- 查看 Railway 日志（Deployments → 点击部署 → Logs）
- 检查数据库连接
- 确认环境变量配置正确

## 📞 需要帮助？

如果遇到问题，请提供：
1. Railway 部署日志截图
2. 错误信息
3. 环境变量配置（隐藏敏感信息）


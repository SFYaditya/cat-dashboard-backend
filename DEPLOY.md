# CAT Dashboard Backend - Railway 部署指南

## 🚀 快速部署步骤

### 前置条件
- Railway 账号（https://railway.app）
- GitHub 账号（用于连接仓库）

### 步骤 1: 准备代码仓库

确保你的代码已经推送到 GitHub：

```bash
cd cat-dashboard-backend
git init  # 如果还没有初始化
git add .
git commit -m "Initial commit: Railway-ready backend"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 步骤 2: 在 Railway 创建项目

1. 访问 [Railway](https://railway.app)
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 授权 Railway 访问你的 GitHub
5. 选择 `cat-dashboard-backend` 仓库

### 步骤 3: 添加 PostgreSQL 数据库

1. 在 Railway 项目中，点击 **"New"**
2. 选择 **"PostgreSQL"**
3. Railway 会自动创建 PostgreSQL 数据库
4. 点击数据库服务，在 **"Variables"** 标签页找到 `DATABASE_URL`
5. **复制 `DATABASE_URL`**（稍后会用到）

### 步骤 4: 配置环境变量

在 Railway 项目的主服务（不是数据库服务）中：

1. 点击服务名称
2. 进入 **"Variables"** 标签页
3. 点击 **"New Variable"** 添加以下环境变量：

#### 必需的环境变量：

```
DATABASE_URL=<从 PostgreSQL 服务复制的 URL>
```

#### 可选的环境变量（有默认值）：

```
API_PORT=3000
RPC_HTTP=https://psc-mainnet.polysmartchain.com
RPC_WS=wss://psc-ws.polysmartchain.com
CAT_TOKEN_ADDRESS=0xE6e67fc4e00AcAe886Bd17eFB78d547c434a75B5
CAT_LP_ADDRESS=0x74b585f88c7c8bd7828284bd5b325311690a111d
CAT_ROUTER_ADDRESS=0xb7EA48DD32D29037daA0482d98b36e3c0b75EA16
CHAIN_ID=6999
```

**注意**: Railway 会自动提供 `PORT` 环境变量，无需手动设置。

### 步骤 5: 部署

1. Railway 会自动检测 `package.json`
2. 自动运行 `npm install` 和 `npm run build`
3. 然后运行 `npm start`
4. 部署完成后，Railway 会提供一个 URL（例如：`https://your-service.up.railway.app`）

### 步骤 6: 验证部署

1. 访问健康检查端点：
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

2. 测试 API 端点：
   ```
   https://your-service.up.railway.app/api/cat/overview/market
   ```

### 步骤 7: 运行数据库迁移（如果需要）

如果使用 PostgreSQL，可能需要运行迁移：

1. 在 Railway 项目中，点击服务
2. 进入 **"Deployments"** 标签页
3. 点击最新的部署
4. 进入 **"Logs"** 标签页
5. 或者使用 Railway CLI：

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 运行迁移
railway run npm run migrate
```

## 🔧 配置说明

### 端口配置
- Railway 会自动提供 `PORT` 环境变量
- 后端代码会自动使用 `process.env.PORT`
- 无需手动配置端口

### 数据库配置
- **生产环境**: 使用 PostgreSQL（通过 `DATABASE_URL`）
- **本地开发**: 可以使用 SQLite（通过 `DATABASE_PATH`）

### CORS 配置
后端默认允许所有来源的 CORS 请求。如果需要限制，可以修改 `src/index.ts` 中的 CORS 配置。

## 📊 监控和日志

### 查看日志
1. 在 Railway 项目中，点击服务
2. 进入 **"Deployments"** 标签页
3. 点击部署，查看 **"Logs"**

### 监控指标
Railway 会自动监控：
- CPU 使用率
- 内存使用率
- 网络流量
- 请求数

## 🐛 故障排除

### 部署失败
1. 检查构建日志中的错误信息
2. 确保所有依赖都在 `package.json` 中
3. 检查 Node.js 版本（需要 >= 18）

### API 返回 500 错误
1. 检查数据库连接（`DATABASE_URL` 是否正确）
2. 查看 Railway 日志中的错误信息
3. 确保数据库服务正在运行

### 数据库连接失败
1. 确认 `DATABASE_URL` 环境变量已设置
2. 检查 PostgreSQL 服务是否正常运行
3. 确认数据库已创建并可以访问

### 端口错误
- Railway 会自动设置 `PORT` 环境变量
- 不要手动设置 `PORT` 环境变量
- 如果遇到端口问题，检查代码是否使用了 `process.env.PORT`

## 🔗 相关链接

- [Railway 文档](https://docs.railway.app)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Express.js 文档](https://expressjs.com/)

## 📝 部署检查清单

- [ ] 代码已推送到 GitHub
- [ ] Railway 项目已创建
- [ ] PostgreSQL 数据库已添加
- [ ] `DATABASE_URL` 环境变量已设置
- [ ] 其他环境变量已配置（可选）
- [ ] 部署成功
- [ ] 健康检查端点返回正常
- [ ] API 端点可以正常访问

## 🎉 部署完成

部署成功后，你会得到一个 Railway 提供的 URL，例如：
```
https://cat-dashboard-backend-production.up.railway.app
```

将这个 URL 配置到前端的环境变量 `VITE_API_BASE_URL` 中。


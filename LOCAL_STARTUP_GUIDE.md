# AI × Power 本地启动指南

本地开发需要 Node.js 20、pnpm 9 与 Python 3.11。默认使用 SQLite；Redis
不可用时开发环境会降级运行。

## 1. 安装依赖

在仓库根目录执行：

```powershell
pnpm install
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

## 2. 升级数据库并启动 API

每次拉取包含 `backend/alembic/versions` 变更的代码后，先运行迁移。不要只依赖
FastAPI 的开发期 `create_all`，它只能创建缺失表，不能给旧表增加字段或约束。

```powershell
cd backend
.venv\Scripts\python -m alembic upgrade head
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

可访问 `http://127.0.0.1:8000/api/health` 和
`http://127.0.0.1:8000/docs` 验证。开发演示账号只会在
`SEED_DEMO_DATA=true` 时创建；生产配置会拒绝该选项。

## 3. 启动前端

另开终端，在仓库根目录执行：

```powershell
pnpm --filter aixsilicon-web dev
```

入口为 `http://127.0.0.1:3000`。若 Vite 因端口占用切换到 3001，后端默认
CORS 已包含该地址。

## 4. 可选工具服务

静态示例：

```powershell
cd static\tools
python -m http.server 8001
```

动态示例：

```powershell
cd third_party\demo-dynamic
python -m uvicorn app:app --reload --port 8010
```

Vite 仅代理当前仓库实际提供的 `/tools/` 和 `/demo-dynamic/`。新增动态工具时，
需要显式增加本地 Vite 代理；生产环境则按
`deploy/tools.d/README.md` 增加受鉴权的 Nginx 路由。

## 5. 上线前检查

```powershell
pnpm lint
pnpm typecheck
pnpm --filter aixsilicon-web build
cd backend
.venv\Scripts\python -m pytest tests -q
.venv\Scripts\python -m alembic upgrade head
```

Docker 生产部署不是本地开发配置的直接替代。复制并填写
`.env.production.example` 后，再按 `DEPLOYMENT.md` 启动；主站和工具站必须使用
不同浏览器源。

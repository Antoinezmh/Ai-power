# AI-Silicon Platform 本地启动运行指南

> 适用项目：`ai-platform`（aiXsilicon Platform，AI 开发工具集成平台）
> 技术栈：前端 React+Vite（Turbo/Pnpm monorepo） + 后端 FastAPI（Python）

---

## 一、总要：本地启动需要 3 个进程

| 进程 | 作用 | 端口 |
| ---- | ---- | ---- |
| ① 后端 API（FastAPI + Uvicorn） | 提供 `/api` 业务接口 | 8000 |
| ② 静态工具服务（Python http.server） | 提供 `/tools` 下第三方 dist 静态文件 | 8001 |
| ③ 前端 Dev Server（Vite） | 提供页面 `http://localhost:3000` | 3000 |

前端通过 Vite 代理把 `/api` → 8000、`/tools` → 8001。
（若有方式乙集成工具，如 `/cp`→5000、`/rag`→8501，需额外启动对应工具服务。）

---

## 二、环境前置检查

| 软件 | 版本要求 | 说明 |
| ---- | -------- | ---- |
| Node.js | ≥ 20.x | 已装 v20.18.0 ✅ |
| pnpm | 9.x | 已装 9.1.2 ✅ |
| Python | ≥ 3.11（**本地为 3.10.2，见注意事项**） | 已装 3.10.2 ⚠️ |
| PostgreSQL | 15.x 或 SQLite | 本项目用 SQLite，无需安装 ✅ |
| Redis | 可选 | main.py 已做降级，可省 ✅ |
| Git | 任意 | 已装 ✅ |

---

## 三、第一步：拉取代码（若已完成可跳过）

```bash
git clone <仓库地址> aixsilicon-platform
cd aixsilicon-platform
```

---

## 四、第二步：安装前端依赖（根目录）

```bash
pnpm install
```

> 在项目根目录执行，会通过 `pnpm-workspace.yaml` 安装根 + `apps/*` + `packages/*` 全部依赖。

---

## 五、第三步：启动后端服务（终端 1）

```bash
cd services/aixsilicon-api

# 1. 创建并激活虚拟环境（若 venv 已存在可跳过）
python -m venv venv
.\venv\Scripts\Activate.ps1     # PowerShell 激活

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量（把 .env.example 复制为 .env）
#    本地已配置好 SQLite：DATABASE_URL=sqlite+aiosqlite:///./test.db，无需 PostgreSQL
copy .env.example .env          # 首次时执行；已存在可跳过

# 4. 执行数据库迁移（建表）
alembic upgrade head

# 5. 初始化默认数据（创建 admin 管理员、角色、权限）
python scripts/init_db.py
#    默认账号：admin / admin123

# 6. 启动后端
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**验证**：浏览器访问 `http://localhost:8000/docs`（Swagger API 文档）或 `http://localhost:8000/api/health`。

---

## 六、第四步：启动静态工具服务（终端 2）

```bash
cd static/tools
python -m http.server 8001
```

**验证**：浏览器访问 `http://localhost:8001/demo-monitor/index.html`。

> `static/tools/` 已含 `demo-monitor` 示例工具。
> 新增工具：把 dist 放到 `static/tools/<工具名>/index.html` 即可被此服务提供。

---

## 七、第五步：启动前端服务（终端 3）

在项目**根目录**执行：

```bash
pnpm run dev --filter=aixsilicon-web
```

前端运行在 `http://localhost:3000`（端口被占用会自动换，如 3001）。

**验证**：浏览器打开 `http://localhost:3000`，看到登录页即可。

---

## 八、访问验证汇总

| 地址 | 内容 |
| ---- | ---- |
| http://localhost:3000 | 前端登录/主界面 |
| http://localhost:8000/docs | 后端 API 文档 |
| http://localhost:8000/api/health | 后端健康检查 |
| http://localhost:8001/demo-monitor/ | 静态示例工具 |

---

## 九、三终端启动速查表

| 终端 | 命令 |
| ---- | ---- |
| 终端 1（后端） | `cd services/aixsilicon-api && .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000` |
| 终端 2（静态） | `cd static/tools && python -m http.server 8001` |
| 终端 3（前端） | `pnpm run dev --filter=aixsilicon-web` |

---

## 十、Docker 一键启动（可选，生产/全栈）

```bash
# 项目根目录
docker compose up -d
```

生产环境用 Nginx 托管静态文件 + 反代，无需本地第三、第四步的手动进程。

---

## 十一、常用命令速查

| 操作 | 命令 |
| ---- | ---- |
| 安装前端依赖 | `pnpm install` |
| 启动前端 | `pnpm run dev --filter=aixsilicon-web` |
| 启动后端 | `cd services/aixsilicon-api && uvicorn app.main:app --reload` |
| 启动静态服务 | `cd static/tools && python -m http.server 8001` |
| 数据库迁移 | `cd services/aixsilicon-api && alembic upgrade head` |
| 初始化数据 | `cd services/aixsilicon-api && python scripts/init_db.py` |
| 构建前端 | `pnpm run build --filter=aixsilicon-web` |
| 启动 Docker 全栈 | `docker compose up -d` |

---

## 十二、常见坑与注意事项（基于源码验证）

1. **Python 版本**：推荐 3.11+。当前机器为 3.10.2，若 `pip install -r requirements.txt` 或 `alembic upgrade` 报错，建议安装 Python 3.11+，或使用已存在的 `venv`（注意其解释器版本）。
2. **Redis 不是必需**：`app/main.py` 中 Redis 连不上仅打印 warning，不会阻止启动；本地无需 Redis。
3. **数据库**：`.env` 已用 SQLite（`test.db`），无需 PostgreSQL。⚠️ 不要把 `.env.example` 里的默认 `postgresql+asyncpg://aix:aix123@db:5432/...` 直接拷过去，否则连不上。
4. **首次必须做数据库迁移 + 初始化**：只启动不执行 `alembic upgrade head` 和 `init_db.py`，会没有表结构和默认管理员。
5. **前端端口占用**：3000 被占会自动换端口，若换了请同时确认后端 `.env` 的 `CORS_ORIGINS` 是否包含该端口（默认含 3000/3001/8080）。
6. **静态工具无数据**：`static/tools/` 需至少保留一个示例工具（如 `demo-monitor`），否则工具市场无内容。
7. **SSO 默认关闭**：`.env` 中 `SSO_ENABLED=false`，本地直接用 admin/admin123 登录即可。

---

## 十三、方式乙集成工具（按需）

若平台中集成了「CP 报表生成器」(Flask:5000) 或「功率器件知识库 RAG」(Streamlit:8501) 等第三方工具，本地联调需额外启动它们，前端 Vite 已配好 `/cp`、`/rag`、`/streamlit` 代理。生产环境由 Nginx 反代，无需本地启动。

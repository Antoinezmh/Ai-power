# AI × Power

功率器件研发协作平台，包含 AI 助手、工具市场、文件中心、角色/工具授权以及静态和容器化动态工具接入。

## 本地开发

依赖 Node.js 20、pnpm 9、Python 3.11。开发模式默认使用 SQLite；Redis 不可用时允许降级。

```bash
pnpm install
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m alembic upgrade head
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

另开终端启动前端：

```bash
pnpm --filter aixsilicon-web dev
```

开发入口为 `http://127.0.0.1:3000`。演示静态工具需在 `static/tools` 目录启动 `python -m http.server 8001`；演示动态工具需在 `third_party/demo-dynamic` 启动 `uvicorn app:app --reload --port 8010`。

## 生产部署

复制 `.env.production.example` 为服务器上的 `.env`，替换所有密码和 `SECRET_KEY`，然后执行：

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:${WEB_PORT:-8080}/api/health
```

生产容器启动时会自动执行 Alembic 迁移。数据库为空时才创建一次性管理员；首次登录并修改密码后，应从 `.env` 删除 `BOOTSTRAP_ADMIN_PASSWORD`。完整步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 工具接入

- `internal`：填写主站前端路由，例如 `/capabilities/spec`。
- `static`：把构建产物放到 `static/tools/<slug>/`，填写 `/tools/<slug>/` 与入口文件。
- `external`：填写 HTTPS 外部地址，外部服务自行负责其内部鉴权。
- `streamlit`：先容器化部署，再在 `deploy/tools.d/<slug>.conf` 配置受保护代理路径。

平台当前不直接运行服务器上的 `.exe`、批处理或任意脚本。需要计算后端时，应构建固定镜像，并配置非 root 用户、CPU/内存/PID/超时限制、健康检查和独立数据卷。

静态和动态工具必须通过工具市场打开：后端会校验页面权限及用户/角色工具授权，签发短时启动票据，Nginx 对后续资源继续鉴权。生产环境的 `TOOL_PUBLIC_ORIGIN` 必须与 `PUBLIC_URL` 不同源（不同端口或独立子域），从浏览器源层面隔离主站凭证。

## 文件与 API

文件按“一级分组 / 功能型 / namespace”存放。小文件使用 multipart 上传，大文件自动使用 5 MB 分片；生产网关将单次请求限制为 8 MB，服务端另行限制单文件逻辑大小、总容量和最小磁盘剩余空间。下载使用短时票据，由浏览器直接流式保存。

个人 API 密钥只在创建时显示一次，数据库仅保存不可逆摘要。调用接口时使用：

```text
X-API-Key: ak_xxxx_secret
```

动态工具访问平台文件时应使用受限服务账号和 API，不应直接挂载整个文件卷。

## 上线前验证

```bash
pnpm lint
pnpm typecheck
pnpm --filter aixsilicon-web build
cd backend
.venv/Scripts/python -m pytest tests -q
.venv/Scripts/python -m alembic upgrade head
```

当前生产数据位于 PostgreSQL、`file-data` named volume；每日运行 `bash deploy/backup.sh /srv/aipower-backups` 并把备份同步到异机或对象存储。

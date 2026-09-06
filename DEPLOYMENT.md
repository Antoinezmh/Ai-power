# 工具部署与接入

## 一次启动

服务器上复制 `.env.production.example` 为 `.env`，设置强随机 `SECRET_KEY`、PostgreSQL 密码、一次性管理员密码、服务器访问地址和端口后执行：

```bash
docker compose up -d --build
```

统一入口为 `http://<服务器IP>:8080`（可通过 `WEB_PORT` 修改）。

网络访问说明：

- 内网环境：将 `PUBLIC_URL` 和 `CORS_ORIGINS` 写成服务器的内网 IP，例如 `http://192.168.1.100:8080`，并在防火墙放行 TCP 8080。
- 公网访问：将两项写成公网 IP 或域名，例如 `https://ai.example.com`；如果前面有 HTTPS 反向代理，容器端口只需绑定到内网，避免直接暴露 API、Redis 和数据库。
- `WEB_BIND_ADDRESS=0.0.0.0` 表示监听服务器所有网卡，适合内网访问；若由宿主机 Nginx/网关统一代理，可改为 `127.0.0.1`。
- 不要把 `localhost` 填入服务器部署后的 `PUBLIC_URL`，那只代表访问者自己的电脑。

部署后检查：

```bash
docker compose ps
docker compose logs --tail=100 api nginx
curl http://127.0.0.1:${WEB_PORT:-8080}/healthz
curl http://127.0.0.1:${WEB_PORT:-8080}/api/health
```

首次启动会自动执行 `alembic upgrade head`。数据库为空时才会创建 `.env` 中的一次性管理员；首次登录并修改密码后，从 `.env` 删除 `BOOTSTRAP_ADMIN_PASSWORD`。

静态工具目录需要提前创建：

```bash
mkdir -p static/tools
docker compose up -d --build
```

## 备份与恢复

业务文件、PostgreSQL 和 Redis 分别存放在 Docker named volume 中。至少每日执行一次数据库备份，并把备份文件同步到另一台机器或对象存储：

```bash
docker compose exec -T postgres pg_dump -U aipower aipower > aipower-$(date +%F).sql
```

升级前同时备份 `postgres-data` 与 `file-data` 卷。恢复演练应作为上线验收的一部分。

## 静态工具

将构建后的文件放入 `static/tools/<slug>/`。在工具市场登记：

```text
type: static
source: /tools/<slug>/
entry: index.html
```

示例：`/tools/demo-monitor/index.html`。

本地联调时，在 `static/tools/` 执行 `python -m http.server 8001`；前端 Vite 会将
`/tools/` 转发到该服务。

## 动态工具

为工具创建 `third_party/<slug>/Dockerfile`，再执行三项接入：

1. 在 `docker-compose.yml` 增加一个服务，服务不映射宿主机端口；只加入 `aipower` 网络。
2. 在 `deploy/nginx.conf` 新增 `upstream` 及 `location /<prefix>/`，通过 `proxy_pass` 指向该服务。
3. 在工具市场登记 `type: external`、`source: /<prefix>/`。

`demo-dynamic` 是完整最小样例，启动后访问 `/demo-dynamic/`。Streamlit 工具需保留 WebSocket 代理头，并以 `--server.baseUrlPath=/<prefix>` 启动。

不使用 Docker 的本地联调可在 `third_party/demo-dynamic/` 执行
`uvicorn app:app --reload --port 8010`；前端 Vite 已代理 `/demo-dynamic/`。

## 文件中心

平台文件持久化在 `file-data` named volume，容器内路径是 `/data/files`。动态工具私有数据使用自己的 named volume；需要共享文件时，可单独只读/读写挂载某个文件中心 namespace，避免把私有模型、向量库和公共文件混在一起。

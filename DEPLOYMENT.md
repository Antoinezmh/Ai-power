# 工具部署与接入

## 一次启动

服务器上复制 `.env.production.example` 为 `.env`，设置强随机 `SECRET_KEY`、PostgreSQL 密码、一次性管理员密码、服务器访问地址和端口后执行：

```bash
docker compose up -d --build
```

主站入口为 `http://<服务器IP>:8080`，工具入口默认为 `http://<服务器IP>:8081`（可通过 `WEB_PORT`、`TOOL_PORT` 修改）。两者必须保持不同源。

网络访问说明：

- 内网环境：将 `PUBLIC_URL` 和 `CORS_ORIGINS` 写成主站内网地址，例如 `http://192.168.1.100:8080`，将 `TOOL_PUBLIC_ORIGIN` 写成 `http://192.168.1.100:8081`，并放行这两个端口。
- 公网访问：推荐 `https://ai.example.com` 代理容器 80、`https://tools.example.com` 代理容器 81；此时设置 `SESSION_COOKIE_SECURE=true`。不要把工具域加入主站 `CORS_ORIGINS`。
- `WEB_BIND_ADDRESS=0.0.0.0` 表示监听服务器所有网卡，适合内网访问；若由宿主机 Nginx/网关统一代理，可改为 `127.0.0.1`。
- 不要把 `localhost` 填入服务器部署后的 `PUBLIC_URL`，那只代表访问者自己的电脑。
- 多个主站来源可在 `CORS_ORIGINS` 中用英文逗号分隔；不要加入工具站来源。
- 下载和工具启动票据位于短时 URL 中；内置生产配置已关闭对应访问日志，不要在上游网关重新记录完整查询串。
- 审计记录默认在线保留 180 天，可通过 `AUDIT_LOG_RETENTION_DAYS`（7–3650）调整；合规要求更长时应同步到独立审计系统，而不是无限扩大业务库。

部署后检查：

```bash
docker compose ps
docker compose logs --tail=100 api nginx
curl http://127.0.0.1:${WEB_PORT:-8080}/healthz
curl http://127.0.0.1:${WEB_PORT:-8080}/api/health
```

首次启动会自动执行 `alembic upgrade head`。数据库为空时才会创建 `.env` 中的一次性管理员；首次登录并修改密码后，从 `.env` 删除 `BOOTSTRAP_ADMIN_PASSWORD`。

## 容量规划

默认 Compose 为 PostgreSQL、API、Redis、Nginx 和演示动态工具分别设置了内存、CPU 与 PID 上限，全部达到上限时容器合计约 3.2 GB 内存。因此基础验收服务器至少应有 4 GB 内存；需要加载多个动态工具、模型或大批文件时建议从 8 GB 起，并为每个新增工具单独设置 `mem_limit`、`cpus`、`pids_limit`、健康检查和日志轮转。`FILE_STORAGE_QUOTA_BYTES` 是逻辑上限，不会预留物理磁盘；宿主机还应额外预留数据库、备份和 `FILE_STORAGE_MIN_FREE_BYTES` 所需空间，并配置磁盘告警。

当前仓库尚未包含经真实租户验证的 IDaaS token/userinfo 适配器，因此生产配置会拒绝 `SSO_ENABLED=true`，避免登录页展示一个无法完成的入口。完成企业端字段映射、state 校验和联调测试后再启用。

本次安全升级会清除 Redis 中旧版明文且实际不可用于鉴权的个人 API Key。用户需在“个人设置 → API 密钥”重新创建；新密钥只显示一次，并通过 `X-API-Key` 请求头使用。

静态工具目录需要提前创建：

```bash
mkdir -p static/tools
docker compose up -d --build
```

## 备份与恢复

业务文件、PostgreSQL 和 Redis 分别存放在 Docker named volume 中。Redis 只承载限流和令牌撤销等可重建状态；必须备份 PostgreSQL 与 `file-data`。仓库提供了同时备份两者的脚本：

```bash
bash deploy/backup.sh /srv/aipower-backups
```

生产环境应通过 cron 在低流量时段每日执行，并把备份同步到另一台机器或对象存储。脚本会短暂停止 API，使 PostgreSQL 元数据与文件卷处于一致的维护窗口；无论成功或失败都会恢复原本正在运行的 API。升级前必须执行一次；恢复时先导入 `postgres-*.sql.gz`，再将 `files-*.tar.gz` 解压回 API 容器的 `/data/files`。恢复演练应作为上线验收的一部分。

`SECRET_KEY` 不应放进普通备份包，但必须单独保存在密码管理器或云密钥服务中；丢失或随意轮换会让现有登录令牌失效，并导致数据库中加密保存的 Agent API Key 无法解密。数据库密码若含 `@`、`:`、`/` 等字符，写入 `DATABASE_URL` 时需做 URL 编码，或使用仅含 URL 安全字符的随机密码。

## 静态工具

将构建后的文件放入 `static/tools/<slug>/`。在工具市场登记：

```text
type: static
source: /tools/<slug>/
entry: index.html
namespace: <slug>
```

示例：`/tools/demo-monitor/index.html`。

本地联调时，在 `static/tools/` 执行 `python -m http.server 8001`；前端 Vite 会将
`/tools/` 转发到该服务。

## 动态工具

为工具创建 `third_party/<slug>/Dockerfile`，再执行三项接入：

1. 在 `docker-compose.yml` 增加一个服务，服务不映射宿主机端口；只加入 `aipower` 网络。
2. 在 `deploy/tools.d/<slug>.conf` 新增受 `auth_request /_tool_auth` 保护的 `location /<prefix>/`，通过 `proxy_pass` 指向该服务。
3. 在工具市场登记 `type: streamlit`（或容器化动态类型）、`namespace: <slug>`、`source: /<slug>/`。namespace、Nginx location 和 source 三者必须一致。

`demo-dynamic` 是完整最小样例，启动后访问 `/demo-dynamic/`。Streamlit 工具需保留 WebSocket 代理头，并以 `--server.baseUrlPath=/<prefix>` 启动。

不使用 Docker 的本地联调可在 `third_party/demo-dynamic/` 执行
`uvicorn app:app --reload --port 8010`；前端 Vite 已代理 `/demo-dynamic/`。

## 文件中心

平台文件持久化在 `file-data` named volume，容器内路径是 `/data/files`，并受逻辑总容量及最小磁盘剩余空间限制。单文件逻辑上限默认 200 MB；生产 Nginx 将单次 HTTP 请求限制为 8 MB，大文件必须使用 5 MB 分片接口，避免 multipart 临时文件挤满 API 容器内存盘。动态工具私有数据使用自己的 named volume。动态工具如需访问平台文件，应使用具备文件菜单权限及对应 namespace 资源授权的服务账号，通过 `X-API-Key` 调用文件 API；不要把整个 `file-data` 卷直接挂入第三方容器，否则会绕过用户与 namespace 权限。

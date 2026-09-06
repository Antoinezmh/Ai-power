# 平台架构与排障手册

## 服务组成
生产环境由 Nginx、FastAPI、PostgreSQL、Redis 和独立工具容器组成。主站 UI/API 与第三方工具必须使用不同浏览器源：`PUBLIC_URL` 指向主站，`TOOL_PUBLIC_ORIGIN` 指向工具端口或工具子域。PostgreSQL 保存业务元数据，`file-data` 保存上传文件，Redis 保存限流和令牌撤销等可重建状态。

## AI 助手配置排障
Agent 配置使用 OpenAI Chat Completions 兼容接口。接口地址可以填写 `/v1` 基址，也可以填写完整的 `/chat/completions` 地址，后端不会重复拼接。模型名必须是服务商实际开放的名称。出现 401/403 通常表示 API Key 无效或账号无模型权限；404 通常表示接口地址或模型名错误；429 表示服务商限流；超时表示云服务器到模型服务的网络或 DNS 不通。查看 `docker compose logs --tail=200 api` 可确认上游状态码，但日志不会记录 API Key。

## 工具注册与启动
新工具默认是受限工具。管理员可显式设为“全员可用”，或在权限管理中授权给用户/角色。首次建立授权会把工具置为受限模式，撤销最后一条授权不会自动公开。AI 推荐、收藏、工具列表和实际启动均使用同一套授权判断。静态及站内动态工具通过工具源兑换两分钟启动票据，并使用十五分钟 HttpOnly 工具会话访问资源。

## 静态工具上线
构建产物放在 `static/tools/<slug>/`，其中必须存在登记的入口文件。注册类型选择 `static`，source 填 `/tools/<slug>/`，namespace 使用唯一的小写短名。生产环境不能从主站的 `/tools/` 直接访问，必须点击工具市场，经独立工具源打开。

## 动态与 Streamlit 工具上线
动态工具必须有固定 Docker 镜像并使用非 root 用户。把服务加入 `aipower` 网络，不映射数据库、Redis或内部 API 端口；配置 CPU、内存、PID、超时、健康检查和独立数据卷。在 `deploy/tools.d/<slug>.conf` 增加带 `auth_request /_tool_auth` 的代理，再注册 `/<slug>/`。Streamlit 还需设置对应 base URL path 并保留 WebSocket 代理头。平台不会执行任意 `.exe`、批处理或管理员填写的脚本路径。

## 文件上传与容量
文件路径固定为“一级分组 / 功能型 / namespace / 文件名”。namespace 只能包含小写字母、数字和连字符。大于 5 MB 的浏览器上传自动分片；每片和完整文件都会校验大小，同一空间的同名文件由文件系统原子占位和数据库唯一约束共同阻止。`MAX_UPLOAD_SIZE` 限制单文件，`FILE_STORAGE_QUOTA_BYTES` 限制逻辑总量，`FILE_STORAGE_MIN_FREE_BYTES` 为系统保留磁盘空间。

## 文件下载与工具取数
网页下载先获取两分钟票据，再由浏览器原生流式保存，不会把整个文件读入 JavaScript 内存。动态工具需要取数时，应使用受限服务账号创建的个人 API 密钥，通过 `X-API-Key` 调用文件 API。不要把整个 `file-data` 卷挂载到第三方工具，否则会绕过用户和 namespace 授权。

## 健康检查与备份
`/api/health` 同时检查数据库、必需的 Redis 和文件存储可写性/剩余空间；`/healthz` 只检查 Nginx 存活。每日运行 `bash deploy/backup.sh /srv/aipower-backups`，同时保存 PostgreSQL 与文件卷，并将备份同步到异机或对象存储。升级前必须备份并执行一次恢复演练。

审计记录默认保留 180 天并在服务启动时清理过期数据，可用 `AUDIT_LOG_RETENTION_DAYS` 调整为 7–3650 天。需要长期合规留存时，应在清理窗口之前输出到独立审计或日志系统。

## 常见部署问题
主站能打开而工具 401，通常是从主站地址直接输入了工具路径、启动票据过期、工具被停用或用户未授权。工具页面 404，检查 `TOOL_PUBLIC_ORIGIN`、第二端口/子域反向代理、`deploy/tools.d` 路由和容器健康状态。API 健康检查 503 时查看响应中的 database、redis、storage 字段，再分别检查数据库连接、Redis 和文件卷权限/磁盘空间。迁移因重复 namespace 或文件路径停止时，先人工确认并处理重复业务记录，不能跳过唯一约束。

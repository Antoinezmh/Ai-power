# 工具部署与接入

## 一次启动

服务器上复制 `.env.production.example` 为 `.env`，设置强随机 `SECRET_KEY` 后执行：

```bash
docker compose up -d --build
```

统一入口为 `http://<host>:8080`（可通过 `WEB_PORT` 修改）。

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

平台文件持久化在 `runtime/files/`，容器内路径是 `/data/files`。动态工具私有数据应挂载到自己的 `runtime/<tool>/`；需要共享文件时，可单独只读/读写挂载某个文件中心 namespace，避免把私有模型、向量库和公共文件混在一起。

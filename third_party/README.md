# 动态工具容器目录

每个需要后端、模型推理、任务执行或 Streamlit 的工具均使用一个独立目录与容器：

```text
third_party/<tool-slug>/Dockerfile
```

在根目录 `docker-compose.yml` 增加服务，并在 `deploy/tools.d/<slug>.conf`
增加带 `auth_request /_tool_auth` 的 URL 前缀反向代理。容器不得映射宿主机
端口，并应配置非 root 用户、资源限制、健康检查和独立数据卷。工具市场登记：
`type=streamlit`（或其他容器化动态类型）、`source=/<tool-prefix>/`。

完整最小样例见 `third_party/demo-dynamic` 与
`deploy/tools.d/demo-dynamic.conf`。不要把动态工具写进主站 Nginx server，也不要
把平台 `file-data` 卷直接挂给工具；需要平台文件时使用受限 API Key 调用文件 API。

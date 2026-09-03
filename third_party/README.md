# 动态工具容器目录

每个需要后端、模型推理、任务执行或 Streamlit 的工具均使用一个独立目录与容器：

```text
third_party/<tool-slug>/Dockerfile
```

在根目录 `docker-compose.yml` 增加服务，并在 `deploy/nginx.conf` 增加同名 URL 前缀反向代理。工具市场登记：`type=external`、`source=/<tool-prefix>/`。

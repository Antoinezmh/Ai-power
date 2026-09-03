# 静态工具挂载目录

每个纯前端工具放在一个独立子目录，入口必须是 `index.html`：

```text
static/tools/<tool-slug>/index.html
```

平台工具市场登记：`type=static`、`source=/tools/<tool-slug>/`、`entry=index.html`。
生产环境由 Nginx 直接挂载本目录；本地开发可在本目录执行
`python -m http.server 8001`，前端 Vite 已将 `/tools` 代理到该端口。

# 动态工具网关配置

每个动态工具使用一个 `<slug>.conf` 文件，并在 `docker-compose.yml` 中使用同名服务。工具注册时 namespace 和 source 分别填写 `<slug>`、`/<slug>/`，必须与这里的 location 一致。配置至少要包含：

```nginx
location /<slug>/ {
    auth_request /_tool_auth;
    proxy_pass http://<compose-service>:<container-port>/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 300s;
}
```

工具容器不要映射宿主机端口，必须使用非 root 用户，并配置 `mem_limit`、`cpus`、`pids_limit`、健康检查和独立数据卷。配置完成后执行 `docker compose up -d --build <service> nginx`，再在工具市场登记同一个 `/<slug>/` 地址。

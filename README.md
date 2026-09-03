# AI-Platform

## 📘 AI 开发工具集成平台 — 本地开发运行指南

本文档详细说明从 Git 拉取代码到本地成功运行前后端服务的完整步骤，并解答关于静态工具集成、多项目支持等常见问题。

---

### 一、环境准备

| 软件       | 版本要求               | 备注                                            |
| ---------- | ---------------------- | ----------------------------------------------- |
| Node.js    | 20.x 或更高            | 用于前端开发                                    |
| pnpm       | 9.x                    | Node.js 包管理器                                |
| Python     | 3.11 或更高            | 用于后端开发                                    |
| PostgreSQL | 15.x（或 SQLite 本地） | 数据库（推荐 PostgreSQL，本地可用 SQLite 简化） |
| Git        | 任意                   | 代码拉取                                        |

---

### 二、克隆代码

```bash
git clone https://your-repo-url/aixsilicon-platform.git
cd aixsilicon-platform
```

---

### 三、前端配置与启动

#### 1. 安装前端依赖

在项目根目录执行：

```bash
pnpm install
```

#### 2. 配置前端环境变量（可选）

复制 `.env.example` 为 `.env.development`（如需修改 API 代理目标）：

```bash
cp .env.example .env.development
```

默认无需修改，Vite 代理已将 `/api` 转发到 `http://localhost:8000`，`/tools` 转发到 `http://localhost:8001`。

#### 3. 启动前端开发服务器

```bash
pnpm run dev --filter=aixsilicon-web
```

前端默认运行在 `http://localhost:3000`（如果端口被占用，Vite 会自动切换到其他端口，如 3001）。

---

### 四、后端配置与启动

#### 1. 创建 Python 虚拟环境（推荐）

```bash
cd services/aixsilicon-api
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

#### 2. 安装后端依赖

使用 `requirements.txt`（或 `pyproject.toml`）：

```bash
pip install -r requirements.txt
```

如果使用 `pyproject.toml`：

```bash
pip install -e .
```

#### 3. 配置环境变量

复制 `.env.example` 为 `.env`，根据本地环境修改数据库连接等：

```bash
cp .env.example .env
```

**推荐本地使用 SQLite（无需安装 PostgreSQL）**：

编辑 `.env` 文件：

```
DATABASE_URL=sqlite+aiosqlite:///./test.db
REDIS_URL=redis://localhost:6379/0   # 如果没有 Redis，可注释掉或使用内存缓存
```

#### 4. 执行数据库迁移（创建表结构）

```bash
alembic upgrade head
```

#### 5. 初始化默认数据（创建超级管理员、角色、权限）

```bash
python scripts/init_db.py
```

默认管理员账号：`admin` / `admin123`

#### 6. 启动后端服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端运行在 `http://localhost:8000`，API 文档在 `/docs`。

---

### 五、静态工具集成（本地开发）

平台支持将第三方前端静态工具（dist）集成到 `/tools/` 路径下。本地开发时，**需要单独启动一个 HTTP 服务提供这些静态文件**。

#### 1. 放置静态文件

将第三方 dist 文件（如 `index.html`）放入 `static/tools/` 下，例如：

```
static/tools/demo-monitor/index.html
```

#### 2. 启动 Python HTTP 服务器（在 static/tools 目录）

**打开一个新的终端**，执行：

```bash
cd static/tools
python -m http.server 8001
```

服务器将在 `http://localhost:8001` 运行。

#### 3. 配置 Vite 代理（已默认配置）

确保 `apps/aixsilicon-web/vite.config.ts` 包含以下代理：

```ts
proxy: {
  '/tools': {
    target: 'http://localhost:8001',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/tools/, ''),   // 去除前缀
  },
}
```

这样前端访问 `/tools/demo-monitor/index.html` 会被代理到 `http://localhost:8001/demo-monitor/index.html`。

---

### 六、完整本地开发启动步骤（三终端）

建议同时开启三个终端：

| 终端       | 命令                                                          | 说明         |
| ---------- | ------------------------------------------------------------- | ------------ |
| **终端 1** | `cd services/aixsilicon-api && uvicorn app.main:app --reload` | 后端服务     |
| **终端 2** | `cd static/tools && python -m http.server 8001`               | 静态文件服务 |
| **终端 3** | `pnpm run dev --filter=aixsilicon-web`                        | 前端服务     |

**访问**：`http://localhost:3000`（或自动分配的端口），登录后即可使用所有功能。

---

### 七、常见问题与解答

#### Q1：为什么本地开发必须启动 Python HTTP 服务器？上线后还需要吗？

- **本地**：因为没有 Nginx 或类似 Web 服务器，Vite 开发服务器不处理 `/tools/` 请求，因此需要额外服务提供静态文件。
- **上线（生产）**：使用 Docker Compose 启动 Nginx 容器，Nginx 直接托管 `static/tools/` 目录，无需 Python HTTP 服务器。

#### Q2：集成多个项目，是否需要启动多个 Python 服务器？

**不需要**。将所有项目的 dist 文件放在 `static/tools/` 下的不同子目录（如 `tool-a/`、`tool-b/`），只需一个 HTTP 服务器（根目录为 `static/tools/`）即可提供所有文件。

#### Q3：本地开发的 Vite 代理配置，上线后会有影响吗？

- **本地**：代理将 `/tools` 转发到 `http://localhost:8001`，并去除前缀。
- **上线**：使用 Nginx 直接提供静态文件，且不依赖前端代理（因为访问 `http://域名/tools/xxx` 直接由 Nginx 返回）。如果前端应用也部署在同一域名下，无需额外代理。

#### Q4：前后端联调时跨域问题如何解决？

- **本地**：Vite 代理解决了跨域，前端请求 `/api` 被转发到后端。
- **上线**：Nginx 作为反向代理，将 `/api` 转发到后端容器，同样无跨域问题。

#### Q5：如何测试静态工具调用后端 API？

在静态 HTML 中，使用相对路径 `/api/...` 即可。例如调用平台健康检查：`fetch('/api/v1/health')`。本地代理会将 `/api` 转发到后端，上线后 Nginx 同样处理。

---

### 八、生产部署提示

生产环境使用 `docker-compose.yml` 启动所有服务（PostgreSQL、Redis、后端 API、前端静态、Nginx）。此时：

- 无需 Python HTTP 服务器
- Vite 代理不参与（前端已构建为静态文件）
- Nginx 配置文件中已包含 `/tools/` 的 `alias` 映射

---

### 九、常用命令速查

| 操作             | 命令                                                          |
| ---------------- | ------------------------------------------------------------- |
| 安装前端依赖     | `pnpm install`                                                |
| 启动前端         | `pnpm run dev --filter=aixsilicon-web`                        |
| 启动后端         | `cd services/aixsilicon-api && uvicorn app.main:app --reload` |
| 启动静态服务     | `cd static/tools && python -m http.server 8001`               |
| 数据库迁移       | `cd services/aixsilicon-api && alembic upgrade head`          |
| 初始化数据       | `cd services/aixsilicon-api && python scripts/init_db.py`     |
| 构建前端         | `pnpm run build --filter=aixsilicon-web`                      |
| 启动 Docker 全栈 | `docker compose up -d`                                        |

---

### 十、注意事项

- 如果 PostgreSQL 未安装，可使用 SQLite（修改 `.env` 中的 `DATABASE_URL`）。
- 如果 Redis 未安装，可在 `.env` 中注释掉 `REDIS_URL`（需在代码中处理降级，本项目已支持）。
- 确保 `static/tools/` 目录存在，且包含至少一个示例工具（否则平台工具市场无数据）。
- 首次启动后端后，务必执行数据库迁移和初始化数据。

---

### 集成举例

针对**四种集成场景**，分别给出**完整的配置示例**，包括文件放哪里、Nginx 怎么配、Docker Compose 怎么加、平台里怎么填。

---

## 场景一：集成“平台原生开发”的工具（前后端都在主项目中）

**例子**：你开发了一个“代码审查助手”，前端页面在 `/code-review`，后端 API 在 `/api/v1/code-review`。

| 配置项                           | 内容                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| **前端代码位置**                 | `apps/aixsilicon-web/src/pages/CodeReview/`                              |
| **后端代码位置**                 | `services/aixsilicon-api/app/api/v1/code_review.py`                      |
| **是否需要 Nginx 额外配置**      | ❌ 不需要（前端路由由 React Router 处理，后端 API 已有 `/api/v1/` 代理） |
| **是否需要 Docker Compose 修改** | ❌ 不需要                                                                |
| **平台工具注册**                 | **资源类型**：`内部后端API`<br>**资源路径**：`/code-review`              |

---

## 场景二：集成“纯静态前端 dist”（无后端）

**例子**：第三方提供了一个“流程图编辑器”的 dist 包，解压后只有 HTML/CSS/JS，不需要调用任何后端接口。

### 步骤 1：放置文件

```bash
# 在项目根目录下
mkdir -p static/tools/flowchart
unzip flowchart-editor.zip -d static/tools/flowchart/
# 确保 static/tools/flowchart/index.html 存在
```

### 步骤 2：Nginx 配置（无需改动，因为已有全局 `/tools/` 规则）

你的 `nginx.conf` 中已经包含：

```nginx
location /tools/ {
    alias /usr/share/nginx/html/tools/;
    try_files $uri $uri/ /tools/index.html;
}
```

这个规则会**自动处理**所有 `/tools/xxx/` 的请求。

### 步骤 3：Docker Compose（无需改动）

因为 `nginx` 服务已经挂载了 `./static/tools:/usr/share/nginx/html/tools`，新增的文件会自动同步。

### 步骤 4：平台工具注册

| 字段                  | 填写值              |
| --------------------- | ------------------- |
| **名称**              | 流程图编辑器        |
| **资源类型**          | `静态前端文件`      |
| **资源路径 (source)** | `/tools/flowchart/` |
| **入口文件 (entry)**  | `index.html`        |

### 步骤 5：访问

点击“使用工具”后，新窗口打开 `http://你的IP/tools/flowchart/index.html`。

---

## 场景三：集成“静态 dist + 独立后端服务”（前后端分离）

**例子**：第三方提供一个“数据报表系统”，前端是 React 打包的 dist，后端是 Python Flask，提供 `/api/data` 和 `/api/export` 接口。

### 步骤 1：放置前端文件

```bash
mkdir -p static/tools/report
unzip report-frontend.zip -d static/tools/report/
```

### 步骤 2：放置后端源码

```bash
mkdir -p third_party/report-backend
cp -r /path/to/report-backend/* third_party/report-backend/
```

确保 `third_party/report-backend/Dockerfile` 存在，例如：

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

### 步骤 3：修改 `docker-compose.yml`，添加后端服务

在 `services:` 下添加：

```yaml
report-backend:
  build:
    context: ./third_party/report-backend
    dockerfile: Dockerfile
  container_name: report-backend
  ports:
    - "5002:5000" # 宿主机端口映射（可选，用于调试）
  environment:
    - DATABASE_URL=sqlite:///./report.db
  volumes:
    - ./third_party/report-backend:/app
  restart: unless-stopped
  networks:
    - aix-network
```

### 步骤 4：修改 `nginx.conf`，代理后端 API

在 `server` 块中添加：

```nginx
# 数据报表系统后端 API 代理
location /api/ext/report/ {
    rewrite ^/api/ext/report/(.*)$ /$1 break;
    proxy_pass http://report-backend:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 步骤 5：修改 `nginx` 服务的 `depends_on`

确保 Nginx 等待 report-backend 启动：

```yaml
nginx:
  depends_on:
    - api
    - web
    - report-backend # 新增
```

### 步骤 6：平台工具注册

| 字段                  | 填写值                             |
| --------------------- | ---------------------------------- |
| **名称**              | 数据报表系统                       |
| **资源类型**          | `静态前端文件`                     |
| **资源路径 (source)** | `/tools/report/`                   |
| **入口文件 (entry)**  | `index.html`                       |
| **配置 (config)**     | `{"apiPrefix":"/api/ext/report/"}` |

### 步骤 7：前端静态页如何调用后端？

在 `static/tools/report/index.html` 的 JavaScript 中，必须使用 Nginx 代理路径：

```javascript
// ❌ 错误：直接写容器端口（浏览器无法访问）
fetch("http://localhost:5002/data");

// ✅ 正确：走 Nginx 代理
fetch("/api/ext/report/data");
```

### 步骤 8：启动

```bash
docker compose up -d --build report-backend
docker compose restart nginx
```

---

## 场景四：集成“纯外部链接”

**例子**：集成 ChatGPT 官网。

| 配置项                      | 内容                                                                         |
| --------------------------- | ---------------------------------------------------------------------------- |
| **是否需要放置文件**        | ❌ 不需要                                                                    |
| **是否需要 Nginx 配置**     | ❌ 不需要                                                                    |
| **是否需要 Docker Compose** | ❌ 不需要                                                                    |
| **平台工具注册**            | **资源类型**：`外部链接`<br>**资源路径 (source)**：`https://chat.openai.com` |

点击“使用工具”后，直接新窗口打开该 URL。

---

## 总结对照表

| 集成类型        | 文件位置                                              | Nginx 需改？                 | Docker Compose 需改？ | 平台注册类型   | 资源路径填写  |
| --------------- | ----------------------------------------------------- | ---------------------------- | --------------------- | -------------- | ------------- |
| **平台原生**    | 主项目代码中                                          | ❌                           | ❌                    | `内部后端API`  | 前端路由路径  |
| **纯静态 dist** | `static/tools/xxx/`                                   | ❌（全局规则覆盖）           | ❌                    | `静态前端文件` | `/tools/xxx/` |
| **静态 + 后端** | 前端：`static/tools/xxx/`<br>后端：`third_party/xxx/` | ✅ 添加 `/api/ext/xxx/` 代理 | ✅ 添加后端服务       | `静态前端文件` | `/tools/xxx/` |
| **纯外部链接**  | 无                                                    | ❌                           | ❌                    | `外部链接`     | 完整 URL      |

---

## 验证命令

- **测试静态文件**：`curl http://localhost/tools/report/index.html`
- **测试后端代理**：`curl http://localhost/api/ext/report/health`
- **查看容器状态**：`docker compose ps`
- **查看日志**：`docker compose logs report-backend`

这样配置后，四种集成方式都能正常工作，并且互不干扰。

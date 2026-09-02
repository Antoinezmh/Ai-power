# Ai Power

> 面向功率器件（分立器件）研发工程师的部门级工具与 AI 助手平台。

A two-tier web platform:
- **Public site** (`/`) — marketing / capability overview, no auth
- **Authenticated toolbox** (`/app/`) — internal tools, embedded mini-apps, AI Agent

Built with **VitePress + Vue 3** (frontend) and **FastAPI** (backend), designed to run as two containers behind a single Nginx reverse-proxy.

## Features

- 28 tools / 4 capability modules / 7 Gates, covering SPEC -> mass production
- AI Agent floating chat, can invoke tools
- Two-tier architecture: public showcase + authenticated toolbox
- Mock accounts `demo / demo123`; swap for LDAP/SSO in production

## Architecture

```
Browser Nginx :8080 (web container)
/  +-- /api/*  -->  FastAPI :8000 (backend container)
SPA + static assets
```

## Quick start (development)

```bash
# 1) Backend
cd server
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:OPENAI_API_KEY = "sk-..."   # optional, for AI Agent
$env:AIPOWER_USERS = "demo:demo123:Demo User,admin:admin123:Admin"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765

# 2) Frontend
cd ..
npm install
npm run docs:dev      # http://localhost:5173
```

The VitePress dev server proxies `/api/*` to `:8765`.

## Production deploy (Docker)

```bash
cp .env.example .env
docker compose build
docker compose up -d
open http://localhost:8080
```

Two services:
- `aipower-backend` — FastAPI on internal port 8000
- `aipower-web` — Nginx serving VitePress + proxying `/api` to backend

## Demo credentials

| Username | Password | Role     |
|----------|----------|----------|
| demo     | demo123  | engineer |
| admin    | admin123 | admin    |

## Project layout

```
ai-power/
├── docs/                # VitePress source
├── server/              # FastAPI backend
├── nginx/nginx.conf
├── Dockerfile
└── docker-compose.yml
```

## API endpoints

| Method | Path                | Auth | Description |
|--------|---------------------|------|-------------|
| GET    | /api/health         | -    | health check |
| POST   | /api/auth/login     | -    | login, bearer token |
| GET    | /api/me             | yes  | current user |
| GET    | /api/tools          | yes  | list tools |
| POST   | /api/agent/chat     | yes  | OpenAI-compatible chat |

## License

Internal use only. Not for public distribution.

---

## 部署到内网（仅需要登录壳）

本项目作为「登录壳」部署到内网服务器后，访问流程为：

```
浏览器 → vitepress 公开页 / 登录页 → demo/demo123 → 跳转到内网应用
```

配置 `.env`：

```bash
cp .env.example .env

# 登录成功后跳转的目标应用 URL
# - 留空：登录后跳到 vitepress 内部 /app/ 工作台（默认）
# - 设置后：浏览器跳转到该 URL，例如：
VITE_APP_URL=https://your-app.internal.company.local
```

> 账号体系（demo/demo123）仅为占位。内网部署后，接入公司 LDAP/SSO 后修改 `server/app/main.py` 中的 `AIPOWER_USERS` 环境变量即可。

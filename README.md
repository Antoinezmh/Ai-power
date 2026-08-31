# Ai Power

> 面向功率器件（分立器件）研发工程师的部门级工具与 AI 助手平台。

A two-tier web platform:
- **Public site** (`/`) — marketing / capability overview, no auth
- **Authenticated toolbox** (`/app/`) — internal tools, embedded mini-apps, AI Agent

Built with **VitePress + Vue 3** (frontend) and **FastAPI** (backend), designed to run as two containers behind a single Nginx reverse-proxy.

## Architecture

```
            Browser
              |
       Nginx :8080 (web container)
       /  +-- /api/*  -->  FastAPI :8000 (backend container)
            |
        SPA  +  static assets
```

## Quick start (development)

```bash
# 1) Backend
cd server
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:OPENAI_API_KEY = "sk-..."   #  optional, for AI Agent
$env:AIPOWER_USERS = "demo:demo123:Demo User,admin:admin123:Admin"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765

# 2) Frontend (new shell)
cd ..
npm install
npm run docs:dev      # http://localhost:5173
```

The VitePress dev server proxies `/api/*` to `:8765`, so login works out of the box.

## Production deploy (Docker)

```bash
cp .env.example .env
# Edit .env: set OPENAI_API_KEY, customise users, change WEB_PORT if needed

docker compose build
docker compose up -d

# Browse
open http://localhost:8080
```

Two services:
- `aipower-backend` — FastAPI on internal port 8000
- `aipower-web` — Nginx serving VitePress static files + proxying `/api` to backend

To follow logs:
```bash
docker compose logs -f
```

## Demo credentials

| Username | Password   | Role     |
|----------|------------|----------|
| demo     | demo123    | engineer |
| admin    | admin123   | admin    |

In production, switch to LDAP / SSO by replacing the auth handler in `server/app/main.py`.

## Project layout

```
ai-power/
├── docs/                   # VitePress source
│   ├── .vitepress/
│   │   ├── config.mts
│   │   └── theme/
│   │       ├── auth.ts
│   │       ├── Layout.vue
│   │       └── components/
│   │           ├── PublicLanding.vue
│   │           ├── LoginPage.vue
│   │           ├── Workspace.vue
│   │           ├── AgentDock.vue
│   │           └── ...
│   ├── public/             # static assets served as-is
│   ├── index.md            # home (marketing)
│   ├── capabilities.md     # capability detail
│   ├── login.md            # login form
│   ├── app/index.md        # toolbox
│   └── about.md
├── server/                 # FastAPI backend
│   ├── app/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── Dockerfile              # frontend
├── docker-compose.yml
└── .env.example
```

## API endpoints

| Method | Path                 | Auth | Description                     |
|--------|----------------------|------|---------------------------------|
| GET    | /api/health          | -    | health check                    |
| POST   | /api/auth/login      | -    | login, returns bearer token     |
| GET    | /api/me              | yes  | current user                    |
| GET    | /api/tools           | yes  | list tools                      |
| POST   | /api/agent/chat      | yes  | chat with OpenAI-compatible LLM |

Auth: `Authorization: Bearer <token>` (8h expiry).

## Adding a new tool

1. Add entry to `TOOLS` list in `server/app/main.py`.
2. (Optional) Implement the actual tool as an iframe-able URL — point `entry` at it.
3. Rebuild: `docker compose build && docker compose up -d`.

## License
Internal use only. Not for public distribution.

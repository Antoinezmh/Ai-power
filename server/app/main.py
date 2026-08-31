# Ai Power - Backend service
# Run: uvicorn server.app.main:app --host 0.0.0.0 --port 8000
import os
import time
import secrets
import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import httpx

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("aipower")

app = FastAPI(title="Ai Power API", version="0.1.0")

# CORS for dev (vite dev server on :5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# Config (read from env at runtime so Docker secrets / .env work)
# ----------------------------------------------------------------------
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL     = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ALLOWED_USERS   = os.getenv("AIPOWER_USERS", "demo:demo123:工程师 张三,admin:admin123:管理员 李四")

# ----------------------------------------------------------------------
# Auth
# ----------------------------------------------------------------------
USERS_DB: dict[str, dict] = {}
for entry in ALLOWED_USERS.split(","):
    parts = entry.strip().split(":")
    if len(parts) >= 3:
        username, password, display = parts[0], parts[1], ":".join(parts[2:])
        USERS_DB[username] = {"password": password, "displayName": display, "role": "admin" if username == "admin" else "engineer"}

TOKENS: dict[str, dict] = {}  # token -> {user, expires_at}

class LoginBody(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(body: LoginBody):
    user = USERS_DB.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = secrets.token_urlsafe(32)
    expires_in = 8 * 3600  # 8h
    TOKENS[token] = {"user": {"username": body.username, **user}, "expires_at": time.time() + expires_in}
    return {"token": token, "expires_in": expires_in,
            "user": {"username": body.username, "displayName": user["displayName"], "role": user["role"], "groups": []}}

def current_user(authorization: Optional[str] = None):
    from fastapi import Header
    def _inner(authorization: Optional[str] = Header(None)):
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="未登录")
        token = authorization.split(" ", 1)[1]
        entry = TOKENS.get(token)
        if not entry or entry["expires_at"] < time.time():
            raise HTTPException(status_code=401, detail="会话过期")
        return entry["user"]
    return _inner

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = None):
    from fastapi import Header
    pass

@app.get("/api/me")
def me(user = Depends(current_user())):
    return user

# ----------------------------------------------------------------------
# AI Agent - OpenAI-compatible
# ----------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatBody(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None

@app.post("/api/agent/chat")
async def chat(body: ChatBody, user = Depends(current_user())):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="未配置 OPENAI_API_KEY")
    model = body.model or OPENAI_MODEL
    # System prompt for power device context
    sys = ChatMessage(role="system",
        content="你是 Ai Power 助手，专注于功率器件（MOSFET/IGBT/SiC/GaN/二极管）设计。"
                "响应简洁、准确，多用符号与公式。不确定的内容请明确说明。")
    payload = {"model": model, "messages": [sys.dict()] + [m.dict() for m in body.messages]}
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=60.0) as cli:
            r = await cli.post(f"{OPENAI_API_BASE}/chat/completions", json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()
        msg_out = data["choices"][0]["message"]["content"]
        return {"reply": msg_out, "model": model, "usage": data.get("usage")}
    except httpx.HTTPStatusError as e:
        log.exception("upstream error")
        raise HTTPException(status_code=502, detail=f"上游返回 {e.response.status_code}")
    except Exception as e:
        log.exception("chat error")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------------------------
# Tools proxy - serve metadata, allow embedding URLs
# ----------------------------------------------------------------------
TOOLS = [
    {"slug": "mosfet-fom", "title": "MOSFET FoM 计算器", "kind": "web", "status": "stable",
     "group": "规格", "description": "FoM 与 Ron,sp 多电压档对照", "owner": "张工", "entry": "/apps/fom/"},
    {"slug": "thermal-r", "title": "结壳热阻估算", "kind": "web", "status": "stable",
     "group": "规格", "description": "Rth(j-c) 与瞬态热阻折估算", "owner": "李工", "entry": "/apps/thermal/"},
    {"slug": "tcad-cal", "title": "TCAD 校准", "kind": "gui", "status": "stable",
     "group": "建模", "description": "导入实测 IV/CV，自动校准", "owner": "王工", "entry": "/apps/tcad/"},
    {"slug": "soa-drawer", "title": "SOA 安全区绘制", "kind": "gui", "status": "beta",
     "group": "测试", "description": "解析 TLP 数据并绘制 SOA 边界", "owner": "李工", "entry": "/apps/soa/"},
    {"slug": "switch-loss", "title": "开关损耗计算器", "kind": "web", "status": "stable",
     "group": "测试", "description": "从双脉冲波形计算 Eon/Eoff", "owner": "张工", "entry": "/apps/switchloss/"},
    {"slug": "htol", "title": "HTOL 在线监测", "kind": "web", "status": "stable",
     "group": "可靠性", "description": "老化试验样本状态与预警", "owner": "陈工", "entry": "/apps/htol/"},
    {"slug": "binning", "title": "Binning 图工具", "kind": "cli", "status": "stable",
     "group": "测试", "description": "Wafer 级别 Vth/Ron binning", "owner": "王工", "entry": "/apps/binning/"},
]

@app.get("/api/tools")
def list_tools(user = Depends(current_user())):
    return TOOLS

@app.get("/api/health")
def health():
    return {"ok": True, "ts": time.time()}

# ----------------------------------------------------------------------
# Static - mount the built VitePress site if present
# ----------------------------------------------------------------------
DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "docs", ".vitepress", "dist")
if os.path.isdir(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")
    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        full = os.path.join(DIST, path)
        if os.path.isfile(full):
            return FileResponse(full)
        return FileResponse(os.path.join(DIST, "index.html"))

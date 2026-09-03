"""最小动态工具示例：由 Nginx 的 /demo-dynamic/ 前缀反向代理。"""
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Ai Power Dynamic Tool Demo")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "demo-dynamic", "time": datetime.now(timezone.utc).isoformat()}


@app.get("/", response_class=HTMLResponse)
async def home():
    return """<!doctype html><html lang='zh-CN'><meta charset='utf-8'><title>动态工具示例</title>
    <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:10vh auto;max-width:720px;background:#f5f5f7;color:#1d1d1f;padding:40px}main{background:#fff;padding:42px;border-radius:24px}button{background:#0071e3;color:#fff;border:0;border-radius:20px;padding:10px 16px}</style>
    <main><small>CONTAINERIZED DYNAMIC TOOL / DEMO</small><h1>动态工具容器已连接</h1><p>此页来自独立 Docker 容器，经平台的 <code>/demo-dynamic/</code> 前缀访问。</p><button onclick='check()'>健康检查</button><pre id='result'></pre></main>
    <script>async function check(){document.querySelector('#result').textContent=JSON.stringify(await (await fetch('api/health')).json(),null,2)}</script></html>"""

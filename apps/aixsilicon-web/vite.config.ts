import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteMockServe } from 'vite-plugin-mock';

export default defineConfig({
    plugins: [
        react(),
        viteMockServe({
            mockPath: 'mock',
            enable: process.env.NODE_ENV === 'development',
            logger: true,
        }),
    ],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',   // 后端 API
                changeOrigin: true,
            },
            '/tools': {
                target: 'http://localhost:8001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/tools/, ''),
            },
            // 最小动态工具示例：本地以 `uvicorn app:app --port 8010` 启动时，
            // 由 Vite 模拟生产 Nginx 的 /demo-dynamic/ 反代行为。
            '/demo-dynamic': {
                target: 'http://localhost:8010',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/demo-dynamic/, ''),
            },
            // 第三方工具·CP报表生成器（方式乙）：本地 dev 模拟 nginx 的 /cp/ 反代
            // 页面 http://localhost:3000/cp/  -> 转发到本地 Flask(app.py) 5000 的根路由(index.html)
            // API  http://localhost:3000/cp/api/* -> 转发到本地 Flask 5000 的 /api/*
            '/cp': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/cp/, ''),   // 去掉 /cp 前缀，转发给后端真实路径
                // streamlit/长连接可加 ws: true（CP 为 Flask，不需要）
            },
            // 第三方工具·功率器件知识库 RAG（方式乙）：本地 dev 模拟 nginx 的 /rag/ 反代
            // 页面 http://localhost:3000/rag/  -> 转发到本地 streamlit(app.py) 8501 的 /rag 路径
            // _stcore/* -> streamlit 的 WebSocket 长连接端点，需 ws: true 支持
            '/rag': {
                target: 'http://localhost:8501/rag',
                changeOrigin: true,
                ws: true,
                timeout: 3600000,
                proxyTimeout: 3600000,
            },
            // 第三方工具·ChatExcel AI表格分析（方式乙）：本地 dev 模拟 nginx 的 /chatexcel/ 反代
            // 页面 http://localhost:4000/chatexcel/  -> 转发到本地 streamlit(app/main.py) 8501 的根路由
            // _stcore/* -> streamlit 的 WebSocket 长连接端点，需 ws: true 支持
            '/chatexcel': {
                target: 'http://localhost:8501/chatexcel',
                changeOrigin: true,
                ws: true,
                timeout: 3600000,
                proxyTimeout: 3600000,
            },
            // 第三方工具·RAG 通过 type=streamlit 从工具市场打开时的路由
            // 后端 exec/run 返回 /streamlit/{tool_id}/，前端 window.open 访问。
            // streamlit 用相对路径生成资源，故把整个 /streamlit/{id}/ 前缀代理到 8501 root，
            // 支持 WS(_stcore) 长连接。
            '/streamlit': {
                target: 'http://localhost:8501',
                changeOrigin: true,
                ws: true,
                // 去掉 /streamlit/{tool_id} 前缀，转发给 streamlit 真实路径(root)
                rewrite: (path) => path.replace(/^\/streamlit\/[^/]+/, ''),
                // RAG 问答需调用远端 LLM(可长达数十秒), 拉长代理超时避免 504
                timeout: 3600000,
                proxyTimeout: 3600000,
            },
        },
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
});

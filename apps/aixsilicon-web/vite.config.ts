import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',   // 后端 API
                changeOrigin: true,
            },
            '^/tools/.+': {
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
        },
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
});

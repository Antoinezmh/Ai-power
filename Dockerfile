# Stage 1: build
FROM node:20-alpine AS build
  WORKDIR /app
  COPY package.json package-lock.json* ./
  RUN npm ci --no-audit --no-fund
  COPY docs ./docs
  COPY . .

  # Set API base so built bundle talks to same-origin /api
  ENV VITE_API_BASE=/api
  RUN npm run docs:build

# Stage 2: nginx
  FROM nginx:1.27-alpine
  COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
  COPY --from=build /app/docs/.vitepress/dist /usr/share/nginx/html
  EXPOSE 80
  HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1
  CMD ["nginx", "-g", "daemon off;"]

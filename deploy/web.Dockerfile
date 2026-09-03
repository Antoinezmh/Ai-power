FROM node:20-alpine AS build

WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/aixsilicon-web/package.json apps/aixsilicon-web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile
COPY apps ./apps
COPY packages ./packages
RUN pnpm --filter aixsilicon-web run build

FROM nginx:1.27-alpine
COPY --from=build /workspace/apps/aixsilicon-web/dist /usr/share/nginx/html

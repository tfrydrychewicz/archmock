FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/ws-server ./apps/ws-server
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @archmock/ws-server build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/ws-server/dist/index.js"]

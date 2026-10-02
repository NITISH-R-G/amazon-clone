# One long-lived Node process with its database on a mounted volume (PGlite, no separate DB server).
# Run exactly ONE instance: PGlite is a single-process database.
FROM node:24-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV NODE_ENV=production \
    PGLITE_DIR=/data/pglite \
    PORT=3000
VOLUME /data
EXPOSE 3000
# Migrations and the demo seed run at start-up and are idempotent, so a fresh or an existing volume both work.
CMD ["pnpm", "start"]

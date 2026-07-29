# =============================================================
# CodeJudge — Backend Server Dockerfile
# =============================================================
# Follows the project pattern (node:18-alpine) adapted for our
# actual project structure:
#
#   YOUR PATTERN          WHAT WE USE & WHY
#   ─────────────────     ──────────────────────────────────────
#   FROM node:18-alpine   ✅ same — lightweight Alpine base
#   WORKDIR /app          ✅ same
#   apk add g++           ❌ replaced with docker-cli
#                            In Docker mode, code runs in runner
#                            containers — the backend itself does
#                            NOT need compilers. It only needs the
#                            Docker CLI to spawn those containers.
#   COPY . .              ✅ but AFTER package files (layer cache)
#   npm install           ✅ but npm ci for reproducible builds
#   CMD ["node","index.js"] ❌ our entry is src/server.js
#                            (index.js doesn't exist in this project)
# =============================================================

FROM node:18-alpine

# Install Docker CLI so the backend can spawn codejudge-runner containers
# via the Docker socket mounted at /var/run/docker.sock
RUN apk update && apk add --no-cache docker-cli

WORKDIR /app

# Copy manifests first — Docker caches this layer separately.
# Reinstall only happens when package.json changes, not on every code change.
COPY package*.json ./

# Use npm ci (not npm install) for clean, reproducible, production builds
RUN npm ci --omit=dev

# Copy the rest of the source (excluded files are in .dockerignore)
COPY . .

# Expose the API port
EXPOSE 5001

# Start the production server
# Entry point is src/server.js — NOT index.js (package.json "main" field confirms this)
CMD ["node", "src/server.js"]

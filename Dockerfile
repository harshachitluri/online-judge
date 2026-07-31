# =============================================================================
# CodeJudge — single multi-stage Dockerfile
# =============================================================================
# Two targets, one file:
#
#   runner   → what compiles and runs *submitted* code. Alpine + g++ +
#              openjdk17 + python3. Never talks to the network, never holds
#              a credential — it exists purely to be spawned, sandboxed, and
#              killed per submission.
#
#   backend  → the API + judge worker. Node + the Docker CLI (to spawn
#              `runner` containers via the mounted socket), but deliberately
#              NOT the compilers themselves — the backend never executes
#              submitted code directly.
#
# They stay separate *images* even though they're declared in one file:
# untrusted code must not run inside the same container as the process
# holding your JWT secret and database credentials. Merging the Dockerfiles
# is a convenience; merging the images is a security regression. See the
# project README for the reasoning if you're tempted to collapse them.
#
# Build:
#   docker build --target runner  -t codejudge-runner  .
#   docker build --target backend -t codejudge-backend .
# =============================================================================

# ── runner ───────────────────────────────────────────────────────────────────

FROM alpine:3.19 AS runner

RUN apk update && apk add --no-cache \
    g++ \
    openjdk17-jdk \
    python3 \
    coreutils

# Python: container filesystem is effectively read-only from its point of
# view (no reason to persist bytecode across a single submission).
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Java: class-data sharing tries to write a shared archive on first run,
# which fails/warns inside the sandboxed, resource-capped container.
ENV _JAVA_OPTIONS="-Xshare:off"
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk

# Runs as a fixed non-root user rather than whatever uid docker run passes —
# a submission that escapes the process sandbox still doesn't land as root
# inside the container.
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox
USER sandbox

WORKDIR /sandbox

# ── backend ──────────────────────────────────────────────────────────────────

# mongoose 9 / bson 7 require Node >=20.19 (they call
# globalThis.process.getBuiltinModule, added in Node 20.19) — node:18-alpine
# starts and only fails the moment the first Mongo query runs.
FROM node:22-alpine AS backend

# Only the Docker CLI — the backend spawns `runner` containers via the
# socket mounted at /var/run/docker.sock, it never compiles anything itself.
RUN apk update && apk add --no-cache docker-cli

WORKDIR /app

# Manifests first so this layer only invalidates when dependencies change,
# not on every source edit.
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

EXPOSE 5001

CMD ["node", "src/server.js"]

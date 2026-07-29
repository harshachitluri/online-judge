# =============================================================
# CodeJudge — Makefile
# =============================================================
# Automates the Docker workflow from your notes (Image 2):
#
#   Dockerfile ──build──▶ Docker Image ──push──▶ DockerHub (Image Registry)
#                                  │
#                              docker compose up
#
# Commands:
#   make build     → Build both Docker images
#   make up        → Start all services
#   make down      → Stop all services
#   make logs      → Tail backend logs
#   make clean     → Remove containers + images
#   make restart   → Full rebuild + restart
# =============================================================

RUNNER_IMAGE  = codejudge-runner:latest
BACKEND_IMAGE = codejudge-backend:latest

# ── Build Docker Images (Dockerfile → Docker Image) ─────────────

build: build-runner build-backend

build-runner:
	@echo "🔨 Building code runner image (Alpine + g++ + Java + Python3)..."
	docker build -f backend/Dockerfile.runner -t $(RUNNER_IMAGE) .
	@echo "✅ Runner image built: $(RUNNER_IMAGE)"

build-backend:
	@echo "🔨 Building backend server image (Alpine + Node.js + Docker CLI)..."
	docker build -f backend/Dockerfile -t $(BACKEND_IMAGE) ./backend
	@echo "✅ Backend image built: $(BACKEND_IMAGE)"

# ── Compose (start / stop) ──────────────────────────────────────

up:
	@echo "🚀 Starting all services..."
	docker compose up -d
	@echo "✅ Services running — API: http://localhost:5001"

down:
	@echo "🛑 Stopping all services..."
	docker compose down

logs:
	docker compose logs -f backend

# ── Push to DockerHub (Image Registry, per your notes Image 2) ──
# Set DOCKERHUB_USER before pushing: export DOCKERHUB_USER=yourusername

push:
	docker tag $(RUNNER_IMAGE)  $(DOCKERHUB_USER)/codejudge-runner:latest
	docker tag $(BACKEND_IMAGE) $(DOCKERHUB_USER)/codejudge-backend:latest
	docker push $(DOCKERHUB_USER)/codejudge-runner:latest
	docker push $(DOCKERHUB_USER)/codejudge-backend:latest
	@echo "✅ Images pushed to DockerHub"

# ── Full clean ───────────────────────────────────────────────────

clean:
	docker compose down -v
	docker rmi $(RUNNER_IMAGE) $(BACKEND_IMAGE) 2>/dev/null || true
	@echo "🧹 Cleaned up containers and images"

# ── Rebuild + restart ────────────────────────────────────────────

restart: clean build up

# ── Dev (local — no Docker for code execution) ───────────────────

dev-backend:
	@echo "▶ Starting backend in dev mode (DOCKER_ENABLED=false)..."
	cd backend && npm run dev

dev-frontend:
	@echo "▶ Starting frontend dev server..."
	cd frontend && npm start

.PHONY: build build-runner build-backend up down logs push clean restart dev-backend dev-frontend

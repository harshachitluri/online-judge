# CodeJudge

A full-stack online judge platform for practicing coding problems — write, run, and submit solutions in C++, Java, or Python, get instant verdicts, and track progress on a leaderboard.

## Features

- Problem catalog with curriculum tracks and company-wise problem bundles
- Monaco-based in-browser code editor with multi-language support (C++, Java, Python)
- Sandboxed code execution and judging via isolated Docker containers (no network access, memory/CPU/PID limits, read-only filesystem)
- Submission history, verdicts, and per-user analytics
- Leaderboard and public profiles
- JWT-based authentication with a separate admin role for managing problems and test cases

## Tech Stack

**Frontend:** React 19, React Router, Monaco Editor, Framer Motion, Axios
**Backend:** Node.js, Express, Mongoose (MongoDB)
**Execution:** Docker-in-Docker — backend spawns isolated runner containers to compile/execute submitted code
**Infra:** Docker Compose, Nginx-ready static build

## Project Structure

```
.
├── backend/           # Express API + judge worker
│   ├── src/
│   │   ├── controllers/   # Route handlers (problems, submissions, auth, leaderboard, ...)
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express routers
│   │   ├── services/      # Code execution (per-language) and Docker orchestration
│   │   ├── workers/       # Async judge worker
│   │   └── middleware/    # Auth, admin, error handling
│   ├── Dockerfile         # Backend API image
│   └── Dockerfile.runner  # Sandboxed code execution image
├── frontend/           # React SPA
│   └── src/
│       ├── pages/         # Route-level pages (Problems, Submissions, Dashboard, Admin, ...)
│       ├── components/    # Shared UI components
│       └── context/       # Auth/Theme context providers
├── docker-compose.yml   # MongoDB + backend orchestration
└── Makefile             # Convenience commands for building/running the Docker stack
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (required for code execution and running via containers)

### Environment Variables

Create `.env` files for the backend and root as needed (not committed to git). The backend expects at minimum:

```
PORT=5001
MONGO_URI=mongodb://<user>:<pass>@localhost:27017/codejudge?authSource=admin
JWT_SECRET=<your-secret>
CORS_ORIGIN=http://localhost:3000
```

The frontend expects an API base URL, e.g.:

```
REACT_APP_API_URL=http://localhost:5001
```

### Run with Docker Compose (recommended)

```bash
make build   # builds the runner + backend images
docker compose up -d
```

This starts MongoDB and the backend API, with the backend able to spawn isolated runner containers for code execution.

### Run manually (development)

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and proxies API calls to the backend.

## License

ISC

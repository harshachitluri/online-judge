# CodeJudge

A full-stack online judge platform for practicing coding problems — write, run, and submit solutions in C++, Java, or Python, get instant verdicts, chat with a real AI assistant, and track progress on a leaderboard.

## Features

- Problem catalog with topic tracks and company-wise problem bundles
- Monaco-based in-browser code editor with resizable panels and multi-language support (C++, Java, Python)
- Sandboxed code execution and judging via isolated Docker containers (no network access, memory/CPU/PID limits, read-only filesystem)
- **AI Assistant** — real Gemini-backed chat for hints, code review and open-ended questions, alongside instant local (no-network) complexity and static-review checks
- Submission history, verdicts, and per-user analytics (streaks, activity heatmap, verdict/language distribution)
- Leaderboard ranked by unique problems solved and public profiles with earned badges
- JWT-based authentication (email/password), **Google Sign-In**, and **email-based password reset**
- Separate admin role for authoring problems and managing test cases
- Left sidebar navigation grouped into Overview / Practice / Compete / Workspace / Account (+ Admin)

## Tech Stack

**Frontend:** React 19, React Router, Monaco Editor, Framer Motion, GSAP, React Icons, Axios
**Backend:** Node.js, Express, Mongoose (MongoDB)
**AI:** Google Gemini (`@google/generative-ai`) — server-side only, never exposed to the client
**Auth:** JWT (httpOnly cookies) + Google Identity Services (`google-auth-library` for server-side ID token verification)
**Email:** Nodemailer (SMTP), with a console-log fallback in development when SMTP isn't configured
**Execution:** Docker-in-Docker — backend spawns isolated runner containers to compile/execute submitted code
**Infra:** Docker Compose, Nginx-ready static build

## Project Structure

```
.
├── backend/           # Express API + judge worker
│   ├── src/
│   │   ├── controllers/   # Route handlers (problems, submissions, auth, ai, leaderboard, ...)
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express routers
│   │   ├── services/      # Code execution, Gemini, email, Docker orchestration
│   │   ├── workers/       # Async judge worker
│       └── middleware/    # Auth, admin, error handling
├── frontend/           # React SPA
│   └── src/
│       ├── pages/         # Route-level pages (Deck, Vault, Forge, Architect, ...)
│       ├── components/    # ui/ (primitives), shell/ (nav, sidebar, layout), forge/ (editor workspace), charts/
│       ├── context/       # Auth/Theme/Toast context providers
│       ├── services/      # API-calling modules (judge, account, ai, ...)
│       ├── config/        # Brand/navigation config (module names, routes, sidebar groups)
│       ├── lib/            # Formatting, domain vocabulary, motion presets
│       └── styles/        # Design tokens + per-area stylesheets
└── docker-compose.yml   # MongoDB + backend orchestration
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB — either a local install or an Atlas connection string in `MONGO_URI`
- Docker & Docker Compose — optional for development (set `DOCKER_ENABLED=false` and submissions run directly on the host), required for sandboxed execution in production
- A Google Cloud OAuth 2.0 Client ID (for Google Sign-In) and a Gemini API key (for the AI Assistant) — both optional; the app degrades gracefully without them

### Environment Variables

**`backend/.env`:**

```
PORT=5001
MONGO_URI=mongodb://<user>:<pass>@localhost:27017/codejudge?authSource=admin
JWT_SECRET=<your-secret>
CORS_ORIGIN=http://localhost:3000

# Google Sign-In — from Google Cloud Console → Credentials → OAuth 2.0 Client ID
GOOGLE_CLIENT_ID=

# AI Assistant — from Google AI Studio. Server-side only, never exposed to the frontend.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest

# Password reset email — without these, reset links are logged to the console instead
FRONTEND_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="CodeJudge <no-reply@yourdomain.com>"
```

**`frontend/.env`:**

```
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_GOOGLE_CLIENT_ID=<same client ID as backend>
```

For Google Sign-In to work, add `http://localhost:3000` (and your production URL later) to the Client ID's **Authorized JavaScript origins** in Google Cloud Console.

### Run locally (development)

Two terminals. Backend first — the frontend expects the API to be up.

```bash
cd backend
npm install
npm run dev      # nodemon on http://localhost:5001
```

```bash
cd frontend
npm install
npm start        # http://localhost:3000
```

With `DOCKER_ENABLED=false` in `backend/.env`, submissions compile and run
directly on the host — fast, no image builds, and fine for development. It is
not a sandbox, so don't point it at untrusted code.

### Run with Docker Compose

For the sandboxed execution path, build both images from the single root
`Dockerfile` and bring the stack up:

```bash
docker build --target runner  -t codejudge-runner  .
docker build --target backend -t codejudge-backend .
docker compose up -d
```

The backend spawns isolated runner containers (no network, memory cap, PID
limit, read-only filesystem) for each submission. The database is MongoDB
Atlas — set `MONGO_URI` in `.env` first. The frontend still runs with
`npm start` in development.

For a production deployment, `./deploy.sh` does all of the above plus builds
the frontend; Caddy then serves that build and proxies `/api` (see `Caddyfile`).

## License

ISC

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
│   │   └── middleware/    # Auth, admin, error handling
│   ├── Dockerfile         # Backend API image
│   └── Dockerfile.runner  # Sandboxed code execution image
├── frontend/           # React SPA
│   └── src/
│       ├── pages/         # Route-level pages (Deck, Vault, Forge, Architect, ...)
│       ├── components/    # ui/ (primitives), shell/ (nav, sidebar, layout), forge/ (editor workspace), charts/
│       ├── context/       # Auth/Theme/Toast context providers
│       ├── services/      # API-calling modules (judge, account, ai, ...)
│       ├── config/        # Brand/navigation config (module names, routes, sidebar groups)
│       ├── lib/            # Formatting, domain vocabulary, motion presets
│       └── styles/        # Design tokens + per-area stylesheets
├── docker-compose.yml   # MongoDB + backend orchestration
└── Makefile             # Convenience commands for building/running the Docker stack
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (required for code execution and running via containers)
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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Academic full-stack library management system (CEFET-MG, Database I). Two independent npm apps — `backend/` (Express + `pg`, CommonJS) and `frontend/` (React 18 + Vite + Tailwind, ESM) — plus PostgreSQL 16, wired together by `docker-compose.yml`. There is no root `package.json`; run npm commands inside each app directory.

## Commands

Full stack (frontend on :8080, API on :3000, Postgres on 127.0.0.1:5432):

```bash
docker compose up --build
docker compose down            # keeps DB volume
docker compose down --volumes  # wipes DB; init.sql re-runs on next start
docker compose config --quiet  # what CI validates
```

Backend (`cd backend`, Node 20):

```bash
npm ci
npm run dev                # node --watch index.js; needs Postgres + env from backend/.env.example
npm run test:unit          # jest test/unit (no DB needed)
npm run test:integration   # jest test/integration (needs seeded Postgres + DB_* / SECRET_KEY env)
npx jest --runInBand test/unit/auth.test.js -t "<test name>"   # single test
```

The easiest DB for integration tests is the compose `database` service (`docker compose up database`), which exposes 5432 on loopback and is seeded from `backend/database/init.sql`. CI instead loads `init.sql` via `psql` into a fresh Postgres service.

Frontend (`cd frontend`):

```bash
npm ci
npm run dev     # set VITE_API_URL=http://localhost:3000 in frontend/.env when not behind Nginx
npm run lint    # ESLint flat config
npm run build
```

There are no frontend tests. CI (`.github/workflows/ci.yml`) runs: frontend lint+build, backend unit, backend integration, compose config validation.

## Architecture

### Backend request flow

`index.js` waits for the DB (retry loop) then starts `src/app.js`. Every resource is a five-layer vertical slice with matching filenames:

`routers/<x>.js` → `controllers/<x>.js` → `services/<x>.js` → `repositories/<x>.js` → `models/<x>.js` → `config/database.js` (shared `pg.Pool`)

- **Routers** map paths to controller methods; each file defines absolute paths (e.g. `/book/:id`) and is mounted with `app.use(router)` without a prefix.
- **Controllers** pull from `req.params`/`req.body` and map errors to HTTP status (mostly 500 with `error.message`).
- **Services** are mostly pass-through; `services/apiUser.js` holds login/JWT logic.
- **Repositories** do required-field validation (throwing `Error`) and not-found checks.
- **Models** hold raw parameterized SQL and map rows to plain classes. Array columns (e.g. book `Categoria`) are serialized as Postgres array literals `{a,b}`.

Adding a resource means creating all five files and registering the router in `src/app.js`.

### Auth ordering in app.js

Middleware order defines public vs. protected routes: `/health`, `apiUserRegister_Auth` (`POST /auth`, `/auth/loginAdmin`, `/auth/loginUser`) and `userRegister` are mounted **before** `authMiddleware`; everything mounted after requires a JWT. `middleware/auth.js` accepts `Authorization: Bearer <token>` or a bare token and puts the decoded payload on `req.session`. Admin (operator) tokens carry `userLogin`; reader tokens carry `cpfUser`. No role distinction is enforced between them.

### Database

`backend/database/init.sql` is a `pg_dump` (schema + seed data) and is the single source of truth for the schema. There are no migrations. Table and column names are Portuguese (`Livro`, `emprestimo`, `Titulo`, `Data_Devolucao`, …) while JS code/API use English names. Significant business rules live in **PL/pgSQL triggers**, not in JS: stock decrement/increment on loan/return, loan limits per reader, active-loan checks, return-date validation, price-change restrictions, unique categories. Check `init.sql` before reimplementing such rules in the API. Schema changes in `init.sql` only take effect on a fresh volume (`down --volumes`).

Seed operator credentials: `admin` / `admin` (passwords are compared in plaintext).

### Frontend

- Routes are defined in `src/main.jsx` (`createBrowserRouter`); `pages/` are route screens, `components/` are pieces, `routes/` holds leftover tutorial-style routes (Contact, ErrorPage).
- Build API URLs with `apiUrl()` from `src/config/api.js`. `VITE_API_URL` defaults to `/api`; in Docker, `frontend/nginx.conf` proxies `/api/` to `backend:3000/` (stripping the prefix) and serves the SPA with `index.html` fallback.
- Much of the UI is not wired to the API: reader card, library list, loan history, and book/stock edits use hard-coded sample data and local React state; some navigation buttons don't change routes. Operator login does hit the real API. Don't assume a screen persists data without checking.

### preview/

GIF demo assets and the capture pipeline (`preview/tools/capture.mjs` with Playwright, `render.py` with Pillow/FFmpeg). Independent of the app; see `preview/README.md` (Portuguese) for regeneration steps.

## Conventions

- README and preview docs are bilingual (pt-BR first, then English); keep both sections in sync when editing the README.
- Commit messages in history follow `#MAIN - Adjust: <description>.`

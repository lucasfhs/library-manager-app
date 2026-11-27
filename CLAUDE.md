# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Academic full-stack library management system (CEFET-MG, Database I). Two independent npm apps — `backend/` (Express 5 + `pg`, CommonJS) and `frontend/` (React 19 + TypeScript + Vite 8 + Tailwind 4 + shadcn/ui, ESM) — plus PostgreSQL 18, wired together by `docker-compose.yml`. There is no root `package.json`; run npm commands inside each app directory. Node ≥ 22.22 (React Router 8 requires it); Docker images and CI use Node 24. UI copy is Portuguese (pt-BR); code and API messages are English.

Commit messages follow `#MAIN - <Type>: <description>.` (types used: Feat, Fix, Adjust, Chore, Docs).

## Commands

Full stack (frontend :8080, API :3000, Postgres on 127.0.0.1:5432):

```bash
docker compose up --build
docker compose up -d database   # just the seeded DB, for local dev and integration tests
docker compose down --volumes   # wipes the DB; init.sql re-runs on next start
docker compose config --quiet   # what CI validates
```

Backend (`cd backend`):

```bash
npm run dev                # node --watch index.js; needs Postgres + env from backend/.env.example
npm run test:unit          # jest test/unit (no DB)
npm run test:integration   # jest test/integration (needs seeded Postgres + DB_* / SECRET_KEY env)
npx jest --runInBand test/unit/authorize.test.js -t "<test name>"   # single test
```

Integration tests assert on seed data (e.g. category counts, Ana Júlia's overdue loans); some mutate rows and restore them. Reset with `docker compose down --volumes` if the DB drifts.

Frontend (`cd frontend`):

```bash
npm run dev            # set VITE_API_URL=http://localhost:3000 in frontend/.env when not behind Nginx
npm run format         # Prettier (+ Tailwind class sorting); CI runs format:check
npm run lint           # ESLint 10 flat config with typescript-eslint
npm run typecheck      # tsc -b
npm run build          # tsc -b && vite build
npx shadcn add <name>  # add shadcn/ui components into src/components/ui
```

There are no frontend unit tests; behaviour is verified in the browser (see Preview below). CI (`.github/workflows/ci.yml`): frontend format/lint/build, backend unit, backend integration against `postgres:18-alpine`, compose validation.

## Backend architecture

`index.js` waits for the DB, then starts `src/app.js`. Each resource is a five-layer slice with matching filenames: `routers/<x>.js` → `controllers/<x>.js` → `services/<x>.js` → `repositories/<x>.js` → `models/<x>.js` → `config/database.js` (shared `pg.Pool`). Routers declare absolute paths (`/book/:id`) and are mounted with `app.use(router)`; adding a resource means creating all five files and registering the router in `src/app.js`.

- **Validation** lives in repositories (throws `Error("X cannot be null.")`); **SQL** lives in models.
- **Errors**: controllers call `utils/sendError.js`, which maps PostgreSQL codes and messages to statuses — 23505/23503 → 409, 23514 and trigger `RAISE` (P0001) → 422 keeping the Portuguese trigger message, invalid input / "cannot be null" → 400, "not exists" → 404, everything else → 500 with a generic message. Report controllers still return their own 500s.
- **Auth order in `app.js`**: `/health`, `routers/apiUserRegister_Auth` (`POST /auth`, `/auth/loginAdmin`, `/auth/loginUser`) and `routers/userRegister` (`POST /user`) are mounted before `middleware/auth.js`; everything after needs a JWT. `middleware/auth.js` puts the payload on `req.session`; `middleware/authorize.js` then grants operators (`userLogin` claim) everything and readers (`cpfUser` claim) only an allow-list: catalog reads, their own `/user/:cpf` and `/report/getUserLoans/:cpf`, and `POST /loan` for their own CPF. New reader-facing endpoints must be added to that allow-list.
- `POST /auth` (operator sign-up) requires `secretKey === OPERATOR_REGISTRATION_KEY`; unset means disabled.
- `withoutPassword()` strips `senha` from user/operator responses — models still load it because login compares plaintext passwords.
- `config/database.js` makes DATE columns come back as `YYYY-MM-DD` strings. Address columns use the `endereco` composite type; models select its fields individually (`(endereco).rua AS rua`, …) because its text form quotes commas.

## Database

`backend/database/init.sql` is a `pg_dump` (schema + seed) and the only schema source — no migrations. Table/column names are Portuguese (`livro`, `emprestimo`, `livro_biblioteca`, `data_devolucao`) while the JS API uses English request fields (`title`, `idBook`, `cpfUser`, `dateLoan`, `amount`). Business rules live in **PL/pgSQL triggers**: stock decrement on loan insert and increment on return, max 5 open loans, no new loans with a loan open > 30 days, no duplicate open loan of the same book, return date ≥ loan date, price change within ±50%, unique categories. Categories are restricted by a CHECK constraint (mirrored in `frontend/src/lib/domain.ts`). Report queries return lower-cased aliases and NUMERIC/BIGINT values as strings. Schema edits only apply to a fresh volume (`postgres18_data`).

Seed logins: operator `admin`/`admin`; reader CPF `32168781044` / `1234` (no open loans). Ana Júlia (`23611482005`) has overdue loans and is blocked from borrowing.

## Frontend architecture

- `src/main.tsx` → `app/providers.tsx` (ThemeProvider, TanStack QueryClient, SessionProvider, TooltipProvider, Sonner) → `app/router.tsx`. Every page and both area layouts are lazy routes. Public paths kept from the original app: `/`, `/loginUser`, `/loginAdmin`, `/registerUser`, `/registerAdmin`; reader: `/user` (catalog), `/loan`; operator: `/admin`, `/admin/books`, `/library` (stock), `/admin/loans`, `/admin/libraries`, `/admin/readers`, `/admin/reports`. `components/require-role.tsx` guards each area.
- `lib/api.ts` — `request()` adds the bearer token from `localStorage["libraryManagerToken"]`, throws `ApiError`, and fires a session-expired event on 401. `describeError()` turns API/DB messages into Portuguese UI text; extend its pattern list when a new constraint or rule can reach the UI.
- `lib/session*.ts(x)` — decodes the JWT (role from `userLogin`/`cpfUser`, expiry). `lib/queries.ts` — all TanStack Query hooks and mutations; mutations invalidate the catalog, stock, loan, availability and report keys together because the triggers change stock. `lib/use-loan-rows.ts` joins loans with books, libraries and readers client-side (`GET /loan` returns IDs only).
- `components/ui/` is shadcn output (Radix base, "radix-nova" preset, `cn` from the `cn` package) — regenerate rather than hand-edit; the exceptions are `sidebar.tsx` (desktop root is an `<aside>` landmark) and `sonner.tsx` (uses `lib/theme`). App components (`book-cover`, `form-fields`, `combobox`, `confirm-dialog`, `bar-list`, `states`, `status-badges`) sit beside it.
- Theme: brand tokens and light/dark variables live in `src/index.css` (`--brand`, `--brand-ink`, `--chart-bar`, …). Contrast was audited with axe-core; keep text tokens at ≥ 4.5:1 when changing them. `lib/theme.tsx` plus the inline script in `index.html` handle dark mode (no next-themes).
- Forms use react-hook-form + zod through `TextField`/`PasswordField` (Controller render-prop; the React Hooks 7 `refs` rule rejects `useController` here). Book covers are generated typographically from the book ID; the backend's `img_url` links are dead and unused.
- Vite splits `react`/`react-router` and `@tanstack` into separate chunks (`vite.config.ts`). In Docker, `nginx.conf` proxies `/api/` to `backend:3000/`, caches `/assets` immutably and falls back to `index.html`.

## Preview GIFs

`preview/tools/capture.mjs` builds the frontend, starts the backend against an embedded PostgreSQL 18 seeded from `init.sql`, drives the real flows with Playwright (asserting each write and failing on browser errors), and saves frames to `preview/tools/.capture/`; `render.py` (Pillow + FFmpeg) composes the three GIFs in `preview/`. Run `CHROME_PATH=/usr/bin/google-chrome npm run capture --prefix preview/tools && python3 preview/tools/render.py`. UI label or flow changes usually require updating the selectors in `capture.mjs`. See `preview/README.md`.

## Conventions

- README and preview docs are bilingual (pt-BR first, then English); keep both halves in sync.

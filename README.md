# Library Manager App

<img src="./preview/domestic-life-illustrated.jpg" alt="Library Manager App cover" width="420">

Library Manager App is a full-stack academic library management system originally developed for the Database I course at CEFET-MG. This repository brings the legacy React frontend and Node.js REST API together in one project while keeping each application isolated and independently buildable.

The application manages readers, operators, books, libraries, inventory, loans, authentication, and administrative reports. PostgreSQL stores the domain data and enforces part of the business logic through relationships, functions, and triggers included in the original database dump.

## Technology stack

- Frontend: React 18, Vite, React Router, and Tailwind CSS
- Backend: Node.js 20, Express, JWT, and PostgreSQL client libraries
- Database: PostgreSQL 16
- Runtime: Docker, Docker Compose, and Nginx
- Quality: Jest unit and integration tests, ESLint, and GitHub Actions

## Project structure

```text
library-manager-app/
├── .github/workflows/ci.yml       # Continuous integration pipeline
├── backend/
│   ├── database/init.sql          # Schema and sample data
│   ├── src/                       # API layers and application setup
│   ├── test/unit/                 # Isolated middleware tests
│   ├── test/integration/          # HTTP and PostgreSQL integration tests
│   └── Dockerfile
├── frontend/
│   ├── src/                       # React application
│   ├── nginx.conf                 # SPA hosting and /api reverse proxy
│   └── Dockerfile
├── preview/                       # Project documentation assets
├── docker-compose.yml
└── README.md
```

The backend keeps the legacy layered design: routers receive HTTP requests, controllers coordinate use cases, services hold application behavior, repositories isolate persistence operations, and models execute PostgreSQL queries.

## Run with Docker Compose

Requirements:

- Docker Engine or Docker Desktop
- Docker Compose v2 or later

Start the complete stack:

```bash
docker compose up --build
```

Once all health checks pass, open:

- Web application: [http://localhost:8080](http://localhost:8080)
- API health endpoint: [http://localhost:3000/health](http://localhost:3000/health)

The stack contains three services:

- `frontend` builds the React application and serves it through Nginx.
- `backend` runs the Express REST API.
- `database` initializes PostgreSQL with `backend/database/init.sql` the first time its volume is created.

Stop the stack with `docker compose down`. To deliberately recreate the database from the seed dump, remove its volume with `docker compose down --volumes` and start the stack again. This deletes local database changes.

### Configuration

The included defaults are suitable only for local development. Copy `.env.example` to `.env` before changing ports, credentials, or the JWT secret:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `FRONTEND_PORT` | `8080` | Host port for the web application |
| `BACKEND_PORT` | `3000` | Host port for direct API access |
| `DATABASE_PORT` | `5432` | Loopback-only PostgreSQL port for local integration tests |
| `POSTGRES_DB` | `gomes_library_system` | PostgreSQL database name |
| `POSTGRES_USER` | `gomes_library_system_user` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `library_manager_password` | Local PostgreSQL password |
| `SECRET_KEY` | `local-development-secret` | JWT signing secret |
| `CORS_ORIGIN` | `http://localhost:8080` | Allowed browser origin |

The seeded database includes demonstration records. For example, the operator `admin` uses the password `admin`; never reuse these credentials outside a local demonstration.

## Local development

Run PostgreSQL first, then configure the backend from `backend/.env.example`.

Backend:

```bash
cd backend
npm ci
npm run dev
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Set `VITE_API_URL=http://localhost:3000` in `frontend/.env` when running Vite directly. The Docker setup uses `/api`, which Nginx proxies to the backend service.

## Tests

Run the isolated backend tests:

```bash
cd backend
npm ci
npm run test:unit
```

Integration tests require the seeded PostgreSQL database and the backend environment variables shown in `backend/.env.example`:

```bash
cd backend
npm run test:integration
```

Run frontend quality checks with:

```bash
cd frontend
npm run lint
npm run build
```

The GitHub Actions pipeline runs frontend lint/build checks, backend unit tests, PostgreSQL-backed integration tests, and Docker Compose configuration validation on pull requests and pushes to `main` or `master`.

## Main API resources

Public endpoints include `/health`, operator registration and login under `/auth`, and reader registration under `/user`. All remaining resources require a JWT in the `Authorization: Bearer <token>` header.

- `/book` — book catalog administration
- `/library` — library administration
- `/bookLibrary` — library inventory
- `/loan` — reader loans and returns
- `/user` — reader records
- `/report/*` — catalog, availability, loan, and library reports

## Project presentation

The original presentation video is available on [YouTube](https://www.youtube.com/watch?v=_SDEl3swxnw).

## Credits

- Author: Lucas Henrique
- Contributor: Maria Vitória Peixoto

Cover image: [Freepik AI Illustration](https://www.freepik.com/free-ai-image/domestic-life-illustrated_381099438.htm)

## License

This academic project retains the ISC license declared by the backend package.

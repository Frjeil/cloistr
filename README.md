# Cloistr

Study space check-in app with real-time presence, leaderboards, and level progression.

## Repository layout

- `frontend/` — React + TypeScript + Vite application
- `backend/` — FastAPI + MongoDB (Beanie ODM) backend

## Quick start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env
poetry env use python3.12
poetry install --with dev
poetry run uvicorn app.main:app --reload --port 8000
```

### Full stack (Docker)

```bash
docker compose up --build
```

Services:

- **frontend** → `http://localhost:5176`
- **backend** → `http://localhost:8000`
- **mongo** → `mongodb://localhost:27017`

## Tech stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI library |
| Vite | 8.0 | Build tool & dev server |
| TypeScript | ~6.0 | Type safety |
| Mantine | 9.1 | Component library |
| TanStack Query | 5.100 | Server state management |
| react-hook-form | 7.75 | Form state management |
| Zod | 4.4 | Schema validation |
| react-router-dom | 7.14 | Routing |
| i18next | 26.0 | Internationalization (EN/IT) |
| MapLibre GL | 5.24 | Interactive map |
| Supercluster | 8.0 | Map marker clustering |
| @tabler/icons-react | 3.41 | Icons |
| Biome | 2.4 | Linting + formatting |
| Vitest | 4.1 | Testing |
| Testing Library | 16.x | Component testing |
| jsdom | 29.x | DOM environment for tests |
| @hookform/resolvers | 5.2 | Zod resolver for react-hook-form |
| Impeccable | 2.1 | Design review agent |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.12+ | Runtime |
| FastAPI | 0.116+ | Web framework |
| Uvicorn | 0.35+ | ASGI server |
| Beanie | 1.29+ | MongoDB ODM (async) |
| Motor | 3.7+ | MongoDB async driver |
| Pydantic | 2.10+ | Data validation |
| Pydantic Settings | 2.10+ | Environment config |
| Pillow | 11+ | Image processing |
| python-multipart | 0.0.20+ | File uploads |
| Pytest | 8.3+ | Testing |
| httpx | 0.28+ | HTTP test client |
| Ruff | 0.11+ | Linting + formatting |

## Tooling

| Area | Frontend | Backend |
|------|----------|---------|
| **Linting** | `npm run check` (Biome) | `poetry run ruff check .` |
| **Formatting** | `npm run format:fix` (Biome) | `poetry run ruff format .` |
| **Testing** | `npm test` (Vitest) | `poetry run pytest` |
| **Type checking** | `npm run typecheck` (tsc) | — |
| **Build** | `npm run build` (Vite) | — |
| **Bundle analysis** | `npm run analyze` (rollup-plugin-visualizer) | — |
| **Design review** | `npm run impeccable:teach` / `npm run impeccable:polish` | — |

## Quality checks

### Frontend

```bash
npm run check         # Biome lint
npm run format:fix    # Auto-format
npm run typecheck     # TypeScript
npm run test           # Vitest
npm run build          # Production build
npm run analyze        # Bundle visualizer
```

### Backend

```bash
poetry run pytest       # Tests (in-memory, no MongoDB needed)
poetry run ruff check . # Lint
poetry run ruff format .# Format
```

## Environment

Copy `backend/.env.example` → `backend/.env` and fill in values. The template includes SMTP variables for password-reset emails.

Secrets in `.env` files are git-ignored. Never commit sensitive credentials.

## Architecture notes

- **Repository pattern**: Business logic in `backend/app/repositories/` abstracts MongoDB vs in-memory fallback
- **Level system**: Levels are computed from XP at read time via `app/core/levels.py` — never stored on the profile document
- **API normalizers**: Shared helpers in `frontend/src/utils/normalizers.ts`; domain normalizers in `frontend/src/api/`
- **Rate limiting**: Applied on `/api/auth/login/`, `/api/auth/register/`, and `/api/auth/password/reset/request/`
- **CSRF protection**: Cookie-based per-session tokens, rotated on login/logout
- **Cookie security**: `secure` flag is dynamically set based on `APP_ENV` (secure in production, insecure in development)
- **Password hashing**: PBKDF2-SHA256 (210K iterations)

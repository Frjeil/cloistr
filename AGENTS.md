# Cloistr — Agent Instructions

Study space check-in app: real-time presence, leaderboards, level progression.

## Stack

- **frontend/**: React 19, Vite 8, TypeScript 6, Mantine 9, TanStack Query, react-hook-form + Zod, react-router-dom, i18next (EN/IT), MapLibre GL, Vitest, Biome
- **backend/**: Python 3.12, FastAPI, Beanie ODM + MongoDB, Pydantic, Pytest, Ruff
- **Infra**: Docker Compose

## Commands

### Frontend
```
npm run dev          # Dev server
npm run build        # Production build
npm run check        # Biome lint
npm run format:fix   # Auto-format
npm run typecheck    # TypeScript
npm run doctor       # React Doctor audit
npm test             # Vitest
```

### Backend
```
poetry run uvicorn app.main:app --reload --port 8000   # Dev server
poetry run pytest                                        # Tests
poetry run ruff check .                                  # Lint
poetry run ruff format .                                 # Format
```

### Full stack
```
docker compose up --build
```

## Conventions

- **Frontend**: Components in `src/components/`, pages in `src/pages/`, API calls in `src/api/`, types in `src/types/`, utils in `src/utils/`
- **Backend**: Routes in `app/api/`, models in `app/models/`, repos in `app/repositories/`, schemas in `app/schemas/`, core logic in `app/core/`
- **API normalizers**: Shared helpers in `frontend/src/utils/normalizers.ts`, domain-specific in `frontend/src/api/`
- **Repository pattern**: Business logic in `backend/app/repositories/` abstracts MongoDB vs in-memory fallback
- **Levels**: Computed from XP at read time via `app/core/levels.py` — never stored on profile
- **Rate limiting**: Applied on auth endpoints (`/api/auth/login/`, `/api/auth/register/`, `/api/auth/password/reset/request/`)
- **CSRF**: Cookie-based per-session tokens, rotated on login/logout
- **Cookie security**: `secure` flag set dynamically based on `APP_ENV`
- **Password hashing**: PBKDF2-SHA256 (210K iterations)
- **i18n**: Keys in `frontend/src/i18n/locales/` — always add both EN and IT strings

## Architecture

- `backend/app/core/levels.py` — XP → level computation (read-time, not stored)
- `backend/app/repositories/` — data access layer with in-memory fallback for tests
- `frontend/src/api/` — API client with domain-specific normalizers
- App runs at `frontend→:5176`, `backend→:8000`, `mongo→:27017` via Docker

## Quality

- Run `npm test` and `poetry run pytest` before committing
- Run `npm run check` and `poetry run ruff check .` for lint
- Run `npm run typecheck` for TypeScript checking
- Test backend without MongoDB: in-memory fallback via repository pattern
- Fast feedback: `npm test -- --run <file>` or `poetry run pytest -k <pattern>` for single tests

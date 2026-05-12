# Cloistr Backend

FastAPI + MongoDB (Beanie ODM) backend for Cloistr.

## Routes

| Method | Path | Auth | CSRF | Description |
|--------|------|------|------|-------------|
| GET | `/api/health/` | — | — | Health check |
| GET | `/api/auth/csrf/` | — | — | Set CSRF cookie |
| GET | `/api/auth/me/` | Yes | — | Current session user |
| POST | `/api/auth/login/` | — | Yes | Login (rate-limited) |
| POST | `/api/auth/register/` | — | Yes | Register (rate-limited) |
| POST | `/api/auth/logout/` | Yes | Yes | Logout |
| POST | `/api/auth/password/reset/request/` | — | Yes | Request password reset (rate-limited) |
| POST | `/api/auth/password/reset/confirm/` | — | Yes | Confirm password reset |
| POST | `/api/auth/password/change/` | Yes | Yes | Change password |
| GET | `/api/spaces/search/` | — | — | Search study spaces |
| GET | `/api/leaderboard/` | — | — | Leaderboard rankings |
| GET | `/api/profile/me/` | Yes | — | Profile details |
| PATCH | `/api/profile/me/` | Yes | — | Update profile |
| POST | `/api/profile/avatar/` | Yes | — | Upload avatar |
| DELETE | `/api/profile/avatar/` | Yes | — | Delete avatar |
| POST | `/api/checkins/start/` | Yes | — | Start check-in |
| POST | `/api/checkins/end/` | Yes | — | End check-in |
| GET | `/api/checkins/history/` | Yes | — | Check-in history |

## Auth

Cookie-based sessions with CSRF protection:

- **Session cookie**: `cloistr_session` (HttpOnly, 30-day TTL)
- **CSRF cookie**: `cloistr_csrf` (JavaScript-readable, sent with state-changing requests)
- **Security**: `secure` flag is dynamic based on `APP_ENV`
- **Rate limiting**: login (20/min), register (5/min), password reset (3/5min)
- **Password hashing**: PBKDF2-SHA256 (210K iterations)

## Quick start

```bash
cp .env.example .env
poetry env use python3.12
poetry install --with dev
poetry run uvicorn app.main:app --reload --port 8000
```

The app runs without MongoDB (in-memory fallback) when `MONGODB_URI` is unset.

## Dependencies

### Production

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | >=0.116 | Web framework |
| uvicorn[standard] | >=0.35 | ASGI server |
| pydantic-settings | >=2.10 | Environment config |
| beanie | >=1.29 | MongoDB ODM |
| motor | >=3.7 | MongoDB async driver |
| pymongo | >=4.11 | MongoDB driver |
| python-multipart | >=0.0.20 | File upload parsing |
| Pillow | >=11 | Image processing |

### Dev

| Package | Version | Purpose |
|---------|---------|---------|
| pytest | >=8.3 | Test framework |
| pytest-asyncio | >=1.1 | Async test support |
| httpx | >=0.28 | HTTP test client |
| ruff | >=0.11 | Linter + formatter |

## Quality

```bash
poetry run pytest        # 8 tests (all use in-memory fallback)
poetry run ruff check .  # Lint
poetry run ruff format . # Format
```

## Environment variables

Prefix: `APP_`. See `.env.example` for all variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | Environment name |
| `APP_CORS_ORIGINS` | — | Allowed CORS origins |
| `APP_FRONTEND_BASE_URL` | `http://localhost:5176` | Frontend URL for email links |
| `APP_MONGODB_URI` | — | MongoDB connection string |
| `APP_MONGODB_DB` | `cloistr` | MongoDB database name |
| `APP_MAIL_FROM_ADDRESS` | `no-reply@cloistr.local` | Email from address |
| `APP_SMTP_HOST` | — | SMTP server hostname |
| `APP_SMTP_PORT` | `587` | SMTP port |
| `APP_SMTP_USERNAME` | — | SMTP username |
| `APP_SMTP_PASSWORD` | — | SMTP password |
| `APP_SMTP_USE_TLS` | `True` | Use STARTTLS |
| `APP_SMTP_USE_SSL` | `False` | Use direct SSL |
| `APP_SMTP_TIMEOUT_SECONDS` | `10` | SMTP connection timeout |

## Architecture

```
app/
├── api/routes/     # FastAPI route handlers
├── core/           # Config, DB, auth, email, rate-limit, levels
├── models/         # Beanie ODM document models (MongoDB)
├── repositories/   # Business logic (MongoDB + in-memory fallback)
└── schemas/        # Pydantic request/response schemas
```

- **Repository pattern**: Business logic in `app/repositories/` with in-memory fallback when MongoDB is unavailable
- **Level system**: Levels are computed from XP at read time by `app/core/levels.py` using fixed XP thresholds — no level data stored on the profile document
- **Profile helpers**: Shared in `app/core/profile_helpers.py` (used by both `account.py` and `leaderboard.py`)
- **Email**: Unified `_send_email` helper in `app/core/email.py` (queues in dev, sends via SMTP in production)
- **Rate limiting**: In-memory sliding window in `app/core/rate_limit.py`

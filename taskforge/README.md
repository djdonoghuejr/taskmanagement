# TaskForge

Local-first task management app inspired by Asana.

## Prereqs
- Docker Desktop

## Quick Start

1. From `taskforge/`:

```bash
docker compose up --build
```

2. Backend API: http://localhost:8000/docs
3. Frontend: http://localhost:5173

## Notes
- Uses a fixed system user ID: `00000000-0000-0000-0000-000000000001`.
- DB timestamps are stored in UTC.
- Seed data runs on backend startup when `SEED_DATA=true`.
- Backend Postgres driver is `pg8000` (pure Python) via `postgresql+pg8000://...` URLs.

## Local Dev (without Docker)

Backend:

```bash
cd backend
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
SEED_DATA=true uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Tests

Backend tests (requires Postgres running):

```bash
cd backend
pytest
```

You can also run tests in Docker:

```bash
docker compose run --rm backend pytest
```

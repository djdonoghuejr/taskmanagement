# SecreTerry

Your personal secretary to help you through your day.

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

## Android (Capacitor)

From `frontend/`:

```bash
cp .env.android.example .env.android.local
npm run build:android
npm run cap:sync
```

Open Android Studio:

```bash
npm run android:open
```

Build a sideloadable debug APK:

```bash
npm run android:apk
```

Notes:
- The Android build expects `VITE_API_BASE` to point at a reachable backend, e.g. `https://secreterry.onrender.com/api`.
- Web keeps using cookie auth; the Android shell uses mobile token auth.

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

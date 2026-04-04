from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import ProgrammingError

from .config import ALLOWED_ORIGINS
from .middleware.security import enforce_origin_and_csrf
from .routers import auth, tasks, habits, events, calendar, projects, tags

app = FastAPI(title="TaskForge API")

if ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.middleware("http")
async def csrf_and_origin_middleware(request: Request, call_next):
    try:
        enforce_origin_and_csrf(request)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)

@app.exception_handler(ProgrammingError)
async def db_programming_error_handler(request: Request, exc: ProgrammingError):
    # Common dev failure mode: migrations not applied yet.
    try:
        orig = exc.orig
        if isinstance(orig, Exception) and getattr(orig, "args", None):
            err = orig.args[0]
            if isinstance(err, dict) and err.get("C") == "42P01":
                return JSONResponse(
                    status_code=503,
                    content={
                        "detail": "Database schema is out of date (missing table). Run `alembic upgrade head` (or restart docker-compose backend) and try again."
                    },
                )
    except Exception:
        pass
    return JSONResponse(status_code=500, content={"detail": "Database error"})

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(habits.router)
app.include_router(events.router)
app.include_router(calendar.router)
app.include_router(projects.router)
app.include_router(tags.router)


@app.get("/health")
def health():
    return {"ok": True}

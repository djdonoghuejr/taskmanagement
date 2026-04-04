from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import tasks, habits, events, calendar, projects, tags

app = FastAPI(title="TaskForge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(habits.router)
app.include_router(events.router)
app.include_router(calendar.router)
app.include_router(projects.router)
app.include_router(tags.router)


@app.get("/health")
def health():
    return {"ok": True}

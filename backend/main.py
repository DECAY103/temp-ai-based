"""
main.py — FastAPI application entry point.

Startup lifecycle (lifespan):
  1. Initialise the asyncpg connection pool.
  2. Run orphan-job recovery (M.9 — Person 3).
  3. Yield control to FastAPI.
  4. On shutdown: close the pool.

Run locally:
    uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, close_db, run_migrations, get_pool
from app.config import settings
from app.persistence.recovery import recover_orphaned_jobs
from app.routers import auth, candidates, jobs, processing


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    await init_db()
    await run_migrations()
    await recover_orphaned_jobs()   # M.9 — Person 3
    yield
    # ── Shutdown ───────────────────────────────────────────────────────────────
    await close_db()


app = FastAPI(
    title="AI Resume Screening API",
    description="Cloud-native resume screening engine with two-stage AI evaluation.",
    version="0.1.0",
    lifespan=lifespan,
)

cors_origins = [origin.strip().strip('"').strip("'") for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api/auth",       tags=["auth"])
app.include_router(candidates.router, prefix="/api/candidates", tags=["candidates"])
app.include_router(jobs.router,       prefix="/api/jobs",       tags=["jobs"])
app.include_router(processing.router, prefix="/api/processing", tags=["processing"])


@app.get("/", tags=["health"])
async def root():
    """Liveness landing page for Render inspection."""
    return {
        "name": "AI Resume Screening API",
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "otp_mode": settings.otp_mode,
    }


@app.get("/api/health", tags=["health"])
@app.head("/api/health", tags=["health"])
async def health_check():
    """Comprehensive health and diagnostic probe."""
    db_connected = False
    db_detail = "uninitialized"
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            val = await conn.fetchval("SELECT 1")
            db_connected = (val == 1)
            db_detail = "connected"
    except Exception as exc:
        db_detail = f"error: {str(exc)}"

    return {
        "status": "ok" if db_connected else "degraded",
        "database": db_detail,
        "otp_mode": settings.otp_mode,
        "smtp_configured": bool(settings.smtp_host),
        "smtp_host": settings.smtp_host or "(not configured)",
        "smtp_port": settings.smtp_port,
        "llm_provider": settings.llm_provider,
    }

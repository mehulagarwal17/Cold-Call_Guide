from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_ORIGIN
from app.routes_stages import router as stages_router
from app.routes_calls import router as calls_router

app = FastAPI(
    title="Cold-Call Guide Backend API",
    version="1.0.0",
    description="Backend API for cold-call guidance and call logging.",
)

# Custom validation error handler matching Section 7.3:
# Single 'detail' message, never stack traces.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    if errors:
        first = errors[0]
        loc = [str(x) for x in first.get("loc", []) if x != "body"]
        field_str = " -> ".join(loc)
        msg = first.get("msg", "Invalid value")
        detail = f"{field_str}: {msg}" if field_str else msg
    else:
        detail = "Invalid input"
    return JSONResponse(status_code=422, content={"detail": detail})


# Configure CORS: Allow FRONTEND_ORIGIN, localhost, and web origins via regex
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if FRONTEND_ORIGIN:
    for origin in FRONTEND_ORIGIN.split(","):
        origin_clean = origin.strip()
        if origin_clean and origin_clean not in allowed_origins:
            allowed_origins.append(origin_clean)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stages_router)
app.include_router(calls_router)


@app.get("/")
def root() -> Dict[str, Any]:
    """
    Root status endpoint providing API info and links.
    """
    return {
        "status": "ok",
        "service": "Cold-Call Guide Backend API",
        "health": "/health",
        "stages": "/stages",
        "docs": "/docs",
    }


@app.get("/health")
def health_check() -> Dict[str, Any]:
    """
    Liveness check endpoint.
    Returns 200 with status 'ok' and ISO server time.
    """
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/debug-llm")
def debug_llm() -> Dict[str, Any]:
    """
    Safe diagnostic endpoint to test LLM connectivity without leaking secrets.
    """
    from app.config import LLM_PROVIDER, LLM_API_KEY, LLM_MODEL
    from app.llm import generate_summary, DEFAULT_MODELS

    key_found = bool(LLM_API_KEY)
    key_preview = (
        (LLM_API_KEY[:4] + "..." + LLM_API_KEY[-3:])
        if len(LLM_API_KEY) > 8
        else ("present" if key_found else "missing")
    )
    provider = (LLM_PROVIDER or "gemini").lower().strip()
    model = (LLM_MODEL or DEFAULT_MODELS.get(provider, "gemini-2.5-flash")).strip()

    dummy_call = {
        "prospect_name": "Test Prospect",
        "prospect_role": "Director",
        "company": "Test Co",
        "furthest_stage": 5,
        "furthest_stage_name": "Their need",
        "outcome": "ended_early",
    }
    dummy_stages = [
        {"stage_id": 1, "tap_key": "reached_right_person", "prospect_words": "Direct line"},
        {"stage_id": 5, "tap_key": "described_situation", "prospect_words": "Machinery delay takes 3 weeks"},
    ]

    summary = generate_summary(dummy_call, dummy_stages, {1: "Opening", 5: "Their need"})
    return {
        "key_present": key_found,
        "key_preview": key_preview,
        "provider": provider,
        "model": model,
        "success": bool(summary),
        "test_summary": summary,
    }


"""FastAPI application: wiring of routers, CORS, error handlers and startup."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import Base, SessionLocal, engine
from .deps import CurrentUser
from .errors import AnswerValidationError, DomainError
from .routers import forms, public, results
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # The schema is small and created from the models; see README for why
    # there is no migration tool.
    Base.metadata.create_all(engine)
    if settings.seed_on_startup:
        with SessionLocal() as db:
            seed_if_empty(db)
    yield


app = FastAPI(title="Typeform Clone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(AnswerValidationError)
async def handle_answer_errors(_request: Request, exc: AnswerValidationError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.message,
            "errors": [{"question_id": qid, "message": msg} for qid, msg in exc.errors.items()],
        },
    )


@app.exception_handler(DomainError)
async def handle_domain_errors(_request: Request, exc: DomainError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}


@app.get("/api/me", tags=["meta"])
def me(user: CurrentUser):
    """The default creator (auth is simplified, see deps.get_current_user)."""
    return {"name": user.name, "email": user.email}


app.include_router(forms.router)
app.include_router(results.router)
app.include_router(public.router)

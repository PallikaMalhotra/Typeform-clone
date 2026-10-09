"""Public API used by respondents. No authentication: the slug is the key."""

from fastapi import APIRouter, Request, status

from ..deps import DbSession
from ..schemas import AnswersIn, PublicForm, ResponseStarted
from ..services import forms as form_service
from ..services import responses as response_service

router = APIRouter(prefix="/api/public/forms/{slug}", tags=["public"])


@router.get("", response_model=PublicForm)
def get_public_form(slug: str, db: DbSession):
    return form_service.get_published_form(db, slug)


@router.post("/responses", response_model=ResponseStarted, status_code=status.HTTP_201_CREATED)
def start_response(slug: str, request: Request, db: DbSession):
    """Called when the respondent starts; lets us measure completion rate."""
    response = response_service.start_response(db, slug, request.headers.get("user-agent"))
    return ResponseStarted(id=response.id)


@router.patch("/responses/{response_id}", status_code=status.HTTP_204_NO_CONTENT)
def save_progress(slug: str, response_id: str, payload: AnswersIn, db: DbSession):
    """Save answers so far (partial response)."""
    response_service.save_partial(db, slug, response_id, payload.answers)


@router.post("/responses/{response_id}/submit", response_model=ResponseStarted)
def submit(slug: str, response_id: str, payload: AnswersIn, db: DbSession):
    response = response_service.submit_response(db, slug, response_id, payload.answers)
    return ResponseStarted(id=response.id)

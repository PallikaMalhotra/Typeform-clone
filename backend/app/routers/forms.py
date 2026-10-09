"""Creator API: form management and the builder."""

from typing import Literal

from fastapi import APIRouter, Query, status

from ..deps import CurrentUser, DbSession
from ..question_types import FormStatus
from ..schemas import FormCreate, FormDetail, FormRename, FormSummary, FormUpdate
from ..services import forms as service

router = APIRouter(prefix="/api/forms", tags=["forms"])


@router.get("", response_model=list[FormSummary])
def list_forms(
    db: DbSession,
    user: CurrentUser,
    search: str = Query("", max_length=255),
    sort: Literal["updated", "created", "title"] = "updated",
):
    return service.list_forms(db, user, search=search, sort=sort)


@router.post("", response_model=FormDetail, status_code=status.HTTP_201_CREATED)
def create_form(payload: FormCreate, db: DbSession, user: CurrentUser):
    return service.to_detail(db, service.create_form(db, user, payload.title))


@router.get("/{form_id}", response_model=FormDetail)
def get_form(form_id: str, db: DbSession, user: CurrentUser):
    return service.to_detail(db, service.get_form(db, user, form_id))


@router.put("/{form_id}", response_model=FormDetail)
def update_form(form_id: str, payload: FormUpdate, db: DbSession, user: CurrentUser):
    """Save the whole definition (title, settings, ordered questions)."""
    return service.to_detail(db, service.update_form(db, user, form_id, payload))


@router.patch("/{form_id}", response_model=FormDetail)
def rename_form(form_id: str, payload: FormRename, db: DbSession, user: CurrentUser):
    return service.to_detail(db, service.rename_form(db, user, form_id, payload.title))


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: str, db: DbSession, user: CurrentUser):
    service.delete_form(db, user, form_id)


@router.post("/{form_id}/duplicate", response_model=FormDetail, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: str, db: DbSession, user: CurrentUser):
    return service.to_detail(db, service.duplicate_form(db, user, form_id))


@router.post("/{form_id}/publish", response_model=FormDetail)
def publish_form(form_id: str, db: DbSession, user: CurrentUser):
    return service.to_detail(db, service.set_status(db, user, form_id, FormStatus.PUBLISHED))


@router.post("/{form_id}/unpublish", response_model=FormDetail)
def unpublish_form(form_id: str, db: DbSession, user: CurrentUser):
    return service.to_detail(db, service.set_status(db, user, form_id, FormStatus.DRAFT))

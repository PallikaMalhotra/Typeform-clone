"""Creator API: reading the responses of a form."""

from typing import Annotated

from fastapi import APIRouter, Body, Query, Response, status

from ..deps import CurrentUser, DbSession
from ..schemas import FormSummaryStats, ResponseList, ResponseOut
from ..services import responses as response_service
from ..services import stats as stats_service

router = APIRouter(prefix="/api/forms/{form_id}", tags=["results"])


@router.get("/responses", response_model=ResponseList)
def list_responses(
    form_id: str,
    db: DbSession,
    user: CurrentUser,
    completed: bool = True,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Completed submissions by default; `completed=false` lists partial ones."""
    return response_service.list_responses(db, user, form_id, completed=completed, limit=limit, offset=offset)


@router.get("/responses/{response_id}", response_model=ResponseOut)
def get_response(form_id: str, response_id: str, db: DbSession, user: CurrentUser):
    return response_service.get_response(db, user, form_id, response_id)


@router.post("/responses/delete", status_code=status.HTTP_200_OK)
def delete_responses(
    form_id: str,
    db: DbSession,
    user: CurrentUser,
    ids: Annotated[list[str], Body(embed=True, max_length=500)],
):
    """Bulk delete (a POST because DELETE bodies are poorly supported)."""
    return {"deleted": response_service.delete_responses(db, user, form_id, ids)}


@router.get("/summary", response_model=FormSummaryStats)
def summary(form_id: str, db: DbSession, user: CurrentUser):
    return stats_service.form_summary(db, user, form_id)


@router.get("/export.csv")
def export_csv(form_id: str, db: DbSession, user: CurrentUser):
    filename, content = stats_service.export_csv(db, user, form_id)
    # A BOM makes Excel open the UTF-8 file with the right encoding.
    return Response(
        content="﻿" + content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

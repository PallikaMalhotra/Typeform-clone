"""FastAPI dependencies shared by the routers."""

from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession) -> User:
    """Auth is simplified for this project: every creator request acts as the
    default (first) user. Swapping this for real auth only touches this function."""
    user = db.scalar(select(User).order_by(User.id).limit(1))
    if user is None:
        raise HTTPException(status_code=503, detail="No creator account. Run the seed script.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]

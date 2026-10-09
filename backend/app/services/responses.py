"""Collecting responses (respondent side) and reading them back (creator side)."""

from collections.abc import Mapping

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..errors import AnswerValidationError, ConflictError, NotFoundError
from ..models import Answer, Form, Question, Response, User, utcnow
from ..question_types import CHOICE_TYPES, QuestionType
from ..schemas import AnswerOut, AnswerValue, ResponseList, ResponseOut
from . import forms as form_service
from .logic import visible_path
from .validation import InvalidAnswer, NormalizedAnswer, validate_answer

# ------------------------------------------------------------ respondents


def start_response(db: Session, slug: str, user_agent: str | None) -> Response:
    form = form_service.get_published_form(db, slug)
    response = Response(form_id=form.id, user_agent=(user_agent or "")[:512] or None)
    db.add(response)
    db.commit()
    return response


def _get_open_response(db: Session, form: Form, response_id: str) -> Response:
    response = db.scalar(
        select(Response)
        .options(selectinload(Response.answers).selectinload(Answer.choices))
        .where(Response.id == response_id, Response.form_id == form.id)
    )
    if response is None:
        raise NotFoundError("Response not found")
    if response.is_completed:
        raise ConflictError("This response was already submitted")
    return response


def save_partial(db: Session, slug: str, response_id: str, answers: Mapping[str, AnswerValue]) -> None:
    """Store answers given so far. Format is checked; required-ness is not."""
    form = form_service.get_published_form(db, slug)
    response = _get_open_response(db, form, response_id)
    questions = {q.id: q for q in form.questions}

    normalized: dict[str, NormalizedAnswer | None] = {}
    errors: dict[str, str] = {}
    for question_id, value in answers.items():
        question = questions.get(question_id)
        if question is None:
            continue  # the form may have been edited mid-session; ignore stale ids
        try:
            normalized[question_id] = validate_answer(question, value, enforce_required=False)
        except InvalidAnswer as exc:
            errors[question_id] = str(exc)
    if errors:
        raise AnswerValidationError(errors)

    store_answers(response, questions, normalized, replace_all=False)
    response.updated_at = utcnow()
    db.commit()


def submit_response(db: Session, slug: str, response_id: str, answers: Mapping[str, AnswerValue]) -> Response:
    """Validate the full set of answers along the respondent's path and complete the response."""
    form = form_service.get_published_form(db, slug)
    response = _get_open_response(db, form, response_id)
    questions = {q.id: q for q in form.questions}

    # Only questions on the path matter: a required question skipped by a
    # logic jump must not block submission, and its stale answer is dropped.
    path = visible_path(form.questions, answers)
    normalized: dict[str, NormalizedAnswer | None] = {}
    errors: dict[str, str] = {}
    for question in path:
        try:
            normalized[question.id] = validate_answer(question, answers.get(question.id))
        except InvalidAnswer as exc:
            errors[question.id] = str(exc)
    if errors:
        raise AnswerValidationError(errors)

    store_answers(response, questions, normalized, replace_all=True)
    response.submitted_at = utcnow()
    db.commit()
    return response


def store_answers(
    response: Response,
    questions: Mapping[str, Question],
    normalized: Mapping[str, NormalizedAnswer | None],
    *,
    replace_all: bool,
) -> None:
    existing = {a.question_id: a for a in response.answers}
    kept: list[Answer] = []
    for answer in response.answers:
        if not replace_all and answer.question_id not in normalized:
            kept.append(answer)

    for question_id, value in normalized.items():
        if value is None:
            continue  # empty answer: (re)move any previous one
        answer = existing.get(question_id) or Answer(question_id=question_id)
        answer.text_value = value.text
        answer.number_value = value.number
        answer.boolean_value = value.boolean
        choices = {c.id: c for c in questions[question_id].choices}
        answer.choices = [choices[choice_id] for choice_id in value.choice_ids]
        kept.append(answer)

    response.answers = kept  # delete-orphan removes answers not kept


# --------------------------------------------------------------- creators


def answer_value(question: Question, answer: Answer) -> tuple[AnswerValue, str]:
    """The answer in the shape the respondent sent it, plus a display string."""
    qtype = QuestionType(question.type)
    if qtype in CHOICE_TYPES:
        return [c.id for c in answer.choices], ", ".join(c.label for c in answer.choices)
    if qtype == QuestionType.YES_NO:
        return answer.boolean_value, "Yes" if answer.boolean_value else "No"
    if qtype in (QuestionType.NUMBER, QuestionType.RATING):
        number = answer.number_value
        if number is None:
            return None, ""
        value: int | float = int(number) if number.is_integer() else number
        return value, str(value)
    return answer.text_value, answer.text_value or ""


def to_response_out(response: Response, questions: Mapping[str, Question]) -> ResponseOut:
    answers = []
    for answer in response.answers:
        question = questions.get(answer.question_id)
        if question is None:
            continue
        value, display = answer_value(question, answer)
        answers.append(AnswerOut(question_id=answer.question_id, value=value, display=display))
    # Present answers in question order rather than storage order.
    order = {qid: q.position for qid, q in questions.items()}
    answers.sort(key=lambda a: order.get(a.question_id, 0))
    return ResponseOut(
        id=response.id,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        completed=response.is_completed,
        answers=answers,
    )


def list_responses(
    db: Session, owner: User, form_id: str, *, completed: bool = True, limit: int = 50, offset: int = 0
) -> ResponseList:
    form = form_service.get_form(db, owner, form_id)
    condition = Response.submitted_at.is_not(None) if completed else Response.submitted_at.is_(None)
    base = select(Response).where(Response.form_id == form.id, condition)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.options(selectinload(Response.answers).selectinload(Answer.choices))
        .order_by(func.coalesce(Response.submitted_at, Response.updated_at).desc())
        .limit(limit)
        .offset(offset)
    ).all()
    questions = {q.id: q for q in form.questions}
    return ResponseList(total=total, items=[to_response_out(r, questions) for r in rows])


def get_response(db: Session, owner: User, form_id: str, response_id: str) -> ResponseOut:
    form = form_service.get_form(db, owner, form_id)
    response = db.scalar(
        select(Response)
        .options(selectinload(Response.answers).selectinload(Answer.choices))
        .where(Response.id == response_id, Response.form_id == form.id)
    )
    if response is None:
        raise NotFoundError("Response not found")
    return to_response_out(response, {q.id: q for q in form.questions})


def delete_responses(db: Session, owner: User, form_id: str, response_ids: list[str]) -> int:
    form = form_service.get_form(db, owner, form_id)
    responses = db.scalars(
        select(Response).where(Response.form_id == form.id, Response.id.in_(response_ids))
    ).all()
    for response in responses:
        db.delete(response)
    db.commit()
    return len(responses)

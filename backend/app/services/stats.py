"""Per-question summary statistics, insights and the CSV export."""

import csv
import io
from collections import Counter
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import Answer, Question, Response, User
from ..question_types import CHOICE_TYPES, DEFAULT_RATING_STEPS, TEXT_TYPES, QuestionType
from ..schemas import ChoiceStat, FormInsights, FormSummaryStats, QuestionSummary
from . import forms as form_service
from .responses import answer_value

LATEST_TEXT_ANSWERS = 5


def _seconds_between(start: datetime, end: datetime) -> float:
    # SQLite returns naive datetimes; everything is stored in UTC.
    return (end.replace(tzinfo=None) - start.replace(tzinfo=None)).total_seconds()


def _csv_safe(value: str) -> str:
    # Stop spreadsheet apps from evaluating answers as formulas (CSV injection).
    return f"'{value}" if value[:1] in ("=", "+", "-", "@") else value


def _percent(part: int, whole: int) -> float:
    return round(100 * part / whole, 1) if whole else 0.0


def _load_responses(db: Session, form_id: str) -> list[Response]:
    return list(
        db.scalars(
            select(Response)
            .options(selectinload(Response.answers).selectinload(Answer.choices))
            .where(Response.form_id == form_id)
            .order_by(Response.started_at)
        ).all()
    )


def summarize_question(question: Question, answers: list[Answer]) -> QuestionSummary:
    qtype = QuestionType(question.type)
    summary = QuestionSummary(question_id=question.id, title=question.title, type=qtype, answered=len(answers))
    total = len(answers)

    if qtype in CHOICE_TYPES:
        counts = Counter(choice.id for answer in answers for choice in answer.choices)
        summary.choices = [
            ChoiceStat(label=c.label, count=counts[c.id], percentage=_percent(counts[c.id], total))
            for c in question.choices
        ]
    elif qtype == QuestionType.YES_NO:
        yes = sum(1 for a in answers if a.boolean_value)
        summary.choices = [
            ChoiceStat(label="Yes", count=yes, percentage=_percent(yes, total)),
            ChoiceStat(label="No", count=total - yes, percentage=_percent(total - yes, total)),
        ]
    elif qtype in (QuestionType.NUMBER, QuestionType.RATING):
        numbers = [a.number_value for a in answers if a.number_value is not None]
        if numbers:
            summary.average = round(sum(numbers) / len(numbers), 2)
            summary.minimum = min(numbers)
            summary.maximum = max(numbers)
        if qtype == QuestionType.RATING:
            steps = (question.properties or {}).get("steps") or DEFAULT_RATING_STEPS
            counts = Counter(int(n) for n in numbers)
            summary.choices = [
                ChoiceStat(label=str(step), count=counts[step], percentage=_percent(counts[step], total))
                for step in range(1, steps + 1)
            ]
    else:
        # Answers are loaded oldest first; show the most recent ones.
        summary.latest = [a.text_value or "" for a in reversed(answers[-LATEST_TEXT_ANSWERS:])]
    return summary


def form_summary(db: Session, owner: User, form_id: str) -> FormSummaryStats:
    form = form_service.get_form(db, owner, form_id)
    responses = _load_responses(db, form.id)
    completed = [r for r in responses if r.is_completed]

    by_question: dict[str, list[Answer]] = {q.id: [] for q in form.questions}
    for response in completed:
        for answer in response.answers:
            if answer.question_id in by_question:
                by_question[answer.question_id].append(answer)

    durations = [_seconds_between(r.started_at, r.submitted_at) for r in completed if r.submitted_at]
    insights = FormInsights(
        starts=len(responses),
        submissions=len(completed),
        completion_rate=_percent(len(completed), len(responses)),
        average_time_seconds=round(sum(durations) / len(durations), 1) if durations else None,
    )
    return FormSummaryStats(
        insights=insights,
        questions=[summarize_question(q, by_question[q.id]) for q in form.questions],
    )


def export_csv(db: Session, owner: User, form_id: str) -> tuple[str, str]:
    """Completed responses as CSV. Returns (filename, content)."""
    form = form_service.get_form(db, owner, form_id)
    responses = [r for r in _load_responses(db, form.id) if r.is_completed]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Response ID", "Submitted at (UTC)", *(q.title or "Untitled" for q in form.questions)])
    for response in responses:
        answers = {a.question_id: a for a in response.answers}
        row = [response.id, response.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if response.submitted_at else ""]
        for question in form.questions:
            answer = answers.get(question.id)
            display = answer_value(question, answer)[1] if answer else ""
            row.append(_csv_safe(display) if question.type in TEXT_TYPES else display)
        writer.writerow(row)

    safe_title = "".join(ch if ch.isalnum() else "-" for ch in form.title).strip("-").lower() or "form"
    return f"{safe_title}-responses.csv", buffer.getvalue()

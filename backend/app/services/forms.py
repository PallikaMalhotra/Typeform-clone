"""Form CRUD, the builder's save (questions sync), duplication and publishing."""

import secrets
import string

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..errors import ConflictError, NotFoundError
from ..models import Choice, Form, LogicRule, Question, Response, User, new_uuid, utcnow
from ..question_types import CHOICE_TYPES, LOGIC_TYPES, FormStatus, LogicOperator, QuestionType
from ..schemas import FormDetail, FormSettings, FormSummary, FormUpdate, QuestionIn

SLUG_ALPHABET = string.ascii_letters + string.digits
SORTS = {
    "updated": Form.updated_at.desc(),
    "created": Form.created_at.desc(),
    "title": func.lower(Form.title).asc(),
}


def _new_slug(db: Session) -> str:
    while True:
        slug = "".join(secrets.choice(SLUG_ALPHABET) for _ in range(8))
        if db.scalar(select(Form.id).where(Form.slug == slug)) is None:
            return slug


def _form_query():
    return select(Form).options(
        selectinload(Form.questions).selectinload(Question.choices),
        selectinload(Form.questions).selectinload(Question.logic_rules),
    )


def completed_count(db: Session, form_id: str) -> int:
    return db.scalar(
        select(func.count(Response.id)).where(Response.form_id == form_id, Response.submitted_at.is_not(None))
    ) or 0


# ------------------------------------------------------------------ reads


def list_forms(db: Session, owner: User, *, search: str = "", sort: str = "updated") -> list[FormSummary]:
    response_counts = (
        select(Response.form_id, func.count(Response.id).label("n"))
        .where(Response.submitted_at.is_not(None))
        .group_by(Response.form_id)
        .subquery()
    )
    question_counts = (
        select(Question.form_id, func.count(Question.id).label("n")).group_by(Question.form_id).subquery()
    )
    stmt = (
        select(Form, func.coalesce(response_counts.c.n, 0), func.coalesce(question_counts.c.n, 0))
        .outerjoin(response_counts, response_counts.c.form_id == Form.id)
        .outerjoin(question_counts, question_counts.c.form_id == Form.id)
        .where(Form.owner_id == owner.id)
        .order_by(SORTS.get(sort, SORTS["updated"]))
    )
    if search.strip():
        stmt = stmt.where(Form.title.ilike(f"%{search.strip()}%"))

    return [
        FormSummary(
            id=form.id,
            title=form.title,
            slug=form.slug,
            status=form.status,
            theme=FormSettings.model_validate(form.settings or {}).theme,
            question_count=n_questions,
            response_count=n_responses,
            created_at=form.created_at,
            updated_at=form.updated_at,
            published_at=form.published_at,
        )
        for form, n_responses, n_questions in db.execute(stmt).all()
    ]


def get_form(db: Session, owner: User, form_id: str) -> Form:
    form = db.scalar(_form_query().where(Form.id == form_id, Form.owner_id == owner.id))
    if form is None:
        raise NotFoundError("Form not found")
    return form


def get_published_form(db: Session, slug: str) -> Form:
    form = db.scalar(_form_query().where(Form.slug == slug))
    if form is None or not form.is_published:
        # Same error either way: a draft's existence is not disclosed.
        raise NotFoundError("This form is not accepting responses")
    return form


def to_detail(db: Session, form: Form) -> FormDetail:
    detail = FormDetail.model_validate(form)
    detail.response_count = completed_count(db, form.id)
    return detail


# ----------------------------------------------------------------- writes


def create_form(db: Session, owner: User, title: str) -> Form:
    form = Form(
        owner_id=owner.id,
        title=title or "My new form",
        slug=_new_slug(db),
        status=FormStatus.DRAFT.value,
        settings=FormSettings().model_dump(),
    )
    db.add(form)
    db.commit()
    return get_form(db, owner, form.id)


def rename_form(db: Session, owner: User, form_id: str, title: str) -> Form:
    form = get_form(db, owner, form_id)
    form.title = title
    db.commit()
    return form


def delete_form(db: Session, owner: User, form_id: str) -> None:
    db.delete(get_form(db, owner, form_id))
    db.commit()


def set_status(db: Session, owner: User, form_id: str, status: FormStatus) -> Form:
    form = get_form(db, owner, form_id)
    form.status = status.value
    if status == FormStatus.PUBLISHED:
        form.published_at = utcnow()
    db.commit()
    return form


def update_form(db: Session, owner: User, form_id: str, payload: FormUpdate) -> Form:
    """Replace the form definition with what the builder sent.

    Questions and choices are matched by id and updated in place rather than
    recreated, so answers already collected stay linked to them.
    """
    form = get_form(db, owner, form_id)
    _check_ids_are_free(db, form, payload.questions)

    form.title = payload.title
    form.settings = payload.settings.model_dump()
    # The JSON column is not mutation-tracked; touch updated_at explicitly
    # so a settings-only change still bumps it.
    form.updated_at = utcnow()

    # Rules are cheap to rebuild and may point at questions about to be
    # deleted, so drop them all first and recreate them at the end.
    for question in form.questions:
        question.logic_rules.clear()
    db.flush()

    existing = {q.id: q for q in form.questions}
    incoming_ids = {q.id for q in payload.questions}
    for question in list(form.questions):
        if question.id not in incoming_ids:
            form.questions.remove(question)  # delete-orphan cascade deletes it

    ordered: list[Question] = []
    for position, data in enumerate(payload.questions):
        question = existing.get(data.id) or Question(id=data.id)
        question.position = position
        question.type = data.type.value
        question.title = data.title
        question.description = data.description or None
        question.required = data.required
        question.properties = data.properties.model_dump()
        _sync_choices(question, data)
        ordered.append(question)
    form.questions = ordered
    db.flush()  # questions must exist before rules can point at them

    for question, data in zip(ordered, payload.questions, strict=True):
        question.logic_rules = _build_rules(question, data, incoming_ids)

    db.commit()
    db.expire_all()
    return get_form(db, owner, form_id)


def _check_ids_are_free(db: Session, form: Form, questions: list[QuestionIn]) -> None:
    """Client-generated ids must not collide with another form's rows."""
    question_ids = [q.id for q in questions]
    choice_ids = [c.id for q in questions for c in q.choices]
    if len(set(question_ids)) != len(question_ids) or len(set(choice_ids)) != len(choice_ids):
        raise ConflictError("Duplicate question or choice ids")

    foreign_question = db.scalar(
        select(Question.id).where(Question.id.in_(question_ids), Question.form_id != form.id).limit(1)
    )
    foreign_choice = db.scalar(
        select(Choice.id)
        .join(Question)
        .where(Choice.id.in_(choice_ids), Question.form_id != form.id)
        .limit(1)
    )
    if foreign_question or foreign_choice:
        raise ConflictError("Question or choice id already in use")


def _sync_choices(question: Question, data: QuestionIn) -> None:
    if data.type not in CHOICE_TYPES:
        question.choices = []
        return
    existing = {c.id: c for c in question.choices}
    choices = []
    for position, choice_in in enumerate(data.choices):
        choice = existing.get(choice_in.id) or Choice(id=choice_in.id)
        choice.position = position
        choice.label = choice_in.label
        choices.append(choice)
    question.choices = choices


def _build_rules(question: Question, data: QuestionIn, question_ids: set[str]) -> list[LogicRule]:
    """Keep only rules that make sense for the question; drop dangling ones silently.

    The builder may legitimately hold half-edited rules (e.g. pointing at a
    question that was just deleted), so invalid rules are ignored rather than
    failing the whole autosave.
    """
    if data.type not in LOGIC_TYPES:
        return []
    choice_ids = {c.id for c in data.choices}
    rules = []
    for position, rule in enumerate(data.logic):
        if rule.destination_id is not None and (rule.destination_id not in question_ids or rule.destination_id == data.id):
            continue
        if data.type in CHOICE_TYPES and rule.value not in choice_ids:
            continue
        if data.type == QuestionType.YES_NO and rule.value not in ("true", "false"):
            continue
        is_ordering = rule.operator in (LogicOperator.GREATER_THAN, LogicOperator.LOWER_THAN)
        if is_ordering and data.type not in (QuestionType.NUMBER, QuestionType.RATING):
            continue
        rules.append(
            LogicRule(
                question_id=question.id,
                position=position,
                operator=rule.operator.value,
                value=rule.value,
                destination_question_id=rule.destination_id,
            )
        )
    return rules


def duplicate_form(db: Session, owner: User, form_id: str) -> Form:
    source = get_form(db, owner, form_id)
    copy = Form(
        owner_id=owner.id,
        title=f"Copy of {source.title}"[:255],
        slug=_new_slug(db),
        status=FormStatus.DRAFT.value,
        settings=dict(source.settings),
    )
    question_map: dict[str, str] = {}
    choice_map: dict[str, str] = {}
    for question in source.questions:
        new_question = Question(
            id=new_uuid(),
            position=question.position,
            type=question.type,
            title=question.title,
            description=question.description,
            required=question.required,
            properties=dict(question.properties or {}),
        )
        question_map[question.id] = new_question.id
        for choice in question.choices:
            new_choice = Choice(id=new_uuid(), position=choice.position, label=choice.label)
            choice_map[choice.id] = new_choice.id
            new_question.choices.append(new_choice)
        copy.questions.append(new_question)
    db.add(copy)
    db.flush()

    # Second pass: rules reference other questions and choices by id, remap them.
    for question in source.questions:
        target = db.get(Question, question_map[question.id])
        assert target is not None
        target.logic_rules = [
            LogicRule(
                question_id=target.id,
                position=rule.position,
                operator=rule.operator,
                value=choice_map.get(rule.value, rule.value),
                destination_question_id=question_map.get(rule.destination_question_id or "", None),
            )
            for rule in question.logic_rules
        ]
    db.commit()
    return get_form(db, owner, copy.id)

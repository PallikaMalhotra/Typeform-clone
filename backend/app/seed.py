"""Demo data: a default creator, three forms and a few dozen responses.

Runs on startup when the database is empty, or manually:
    python -m app.seed          # seed if empty
    python -m app.seed --reset  # drop everything and reseed
"""

import random
import sys
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Form, Response, User, new_uuid, utcnow
from .question_types import FormStatus
from .schemas import FormSettings, FormUpdate, QuestionIn
from .services import forms as form_service
from .services.logic import visible_path
from .services.responses import store_answers
from .services.validation import validate_answer


def _q(type_: str, title: str, *, required: bool = False, description: str | None = None,
       choices: list[str] | None = None, **properties) -> dict:
    return {
        "id": new_uuid(),
        "type": type_,
        "title": title,
        "description": description,
        "required": required,
        "properties": properties,
        "choices": [{"id": new_uuid(), "label": label} for label in choices or []],
        "logic": [],
    }


# ------------------------------------------------------------------ forms


def feedback_form() -> tuple[str, dict, list[dict]]:
    questions = [
        _q("short_text", "Hi there! What's your name?", required=True),
        _q("email", "What's the best email to reach you?", required=True,
           description="We'll only use it to follow up on your feedback."),
        _q("rating", "How would you rate your overall experience?", required=True, steps=5, shape="star"),
        _q("multiple_choice", "Which features do you use the most?", required=True, allow_multiple=True,
           choices=["Form builder", "Logic jumps", "Themes", "Integrations", "Analytics"]),
        _q("dropdown", "How did you hear about us?",
           choices=["Search engine", "Friend or colleague", "Social media", "Blog or article", "Podcast", "Other"]),
        _q("yes_no", "Would you recommend us to a friend?", required=True),
        _q("number", "How many people are on your team?", min_value=1, max_value=10000),
        _q("long_text", "Anything else you'd like to share with us?",
           description="Ideas, bugs, compliments: we read every single one."),
    ]
    settings = FormSettings().model_dump()
    settings["welcome"] = {
        "enabled": True,
        "title": "We'd love your feedback 💬",
        "description": "It only takes 2 minutes and helps us build a better product.",
        "button_text": "Let's go",
    }
    settings["thank_you"] = {
        "title": "Thank you! 🙌",
        "description": "Your feedback has been recorded. We really appreciate it.",
        "button_text": "",
        "button_url": "",
    }
    return "Customer Feedback Survey", settings, questions


def event_form() -> tuple[str, dict, list[dict]]:
    attend = _q("yes_no", "Will you join us in person in Bengaluru?", required=True,
                description="Design Summit · 14–15 November 2026")
    ticket = _q("multiple_choice", "Which ticket would you like?", required=True,
                choices=["Standard pass", "VIP pass", "Student pass"])
    diet = _q("dropdown", "Any dietary preference?",
              choices=["No preference", "Vegetarian", "Vegan", "Gluten free", "Jain"])
    workshops = _q("multiple_choice", "Which workshops interest you?", allow_multiple=True,
                   choices=["Design systems", "Motion design", "UX research", "Accessibility"])
    stream = _q("yes_no", "Would you like a link to the livestream instead?", required=True)
    name = _q("short_text", "What's your full name?", required=True)
    email = _q("email", "And your email address?", required=True,
               description="Your ticket or livestream link will be sent here.")
    excitement = _q("rating", "How excited are you, on a scale of 1 to 10?", steps=10, shape="number")

    # Logic: people not attending skip straight to the livestream question...
    attend["logic"] = [{"operator": "is", "value": "false", "destination_id": stream["id"]}]
    # ...and people attending skip it (any workshop answer jumps past it).
    workshops["logic"] = [
        {"operator": "is", "value": c["id"], "destination_id": name["id"]} for c in workshops["choices"]
    ]
    questions = [attend, ticket, diet, workshops, stream, name, email, excitement]

    settings = FormSettings().model_dump()
    settings["theme"] = {
        "background": "#0B2A4A",
        "question": "#FFFFFF",
        "answer": "#8FD3FF",
        "button": "#8FD3FF",
        "button_text": "#0B2A4A",
        "font": "Montserrat",
    }
    settings["thank_you"] = {
        "title": "You're on the list! 🎉",
        "description": "Check your inbox for the confirmation. See you at Design Summit.",
        "button_text": "Visit the event site",
        "button_url": "https://example.com",
    }
    return "Design Summit 2026: Registration", settings, questions


def job_form() -> tuple[str, dict, list[dict]]:
    questions = [
        _q("short_text", "Let's start with your name", required=True),
        _q("email", "Your email address", required=True),
        _q("dropdown", "Which role are you applying for?", required=True,
           choices=["Frontend engineer", "Backend engineer", "Product designer", "Data analyst"]),
        _q("number", "Years of professional experience", required=True, min_value=0, max_value=50),
        _q("long_text", "Tell us about a project you're proud of", required=True, max_length=2000),
        _q("yes_no", "Are you open to working from our Pune office?"),
    ]
    settings = FormSettings().model_dump()
    settings["theme"] = {
        "background": "#FFF8F0",
        "question": "#3D2B1F",
        "answer": "#C2410C",
        "button": "#C2410C",
        "button_text": "#FFFFFF",
        "font": "Lora",
    }
    settings["welcome"] = {
        "enabled": True,
        "title": "Join our team ✨",
        "description": "Six short questions. No cover letter needed.",
        "button_text": "Apply",
    }
    return "Job Application (draft)", settings, questions


# -------------------------------------------------------------- responses

FIRST_NAMES = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Vikram", "Isha", "Arjun", "Sara",
               "Liam", "Emma", "Noah", "Olivia", "Zoya", "Ishaan", "Nikhil", "Priya", "Tara", "Dev"]
LAST_NAMES = ["Sharma", "Iyer", "Khan", "Patel", "Reddy", "Smith", "Fernandes", "Gupta", "Nair", "Das"]
COMMENTS = [
    "Love how smooth the forms feel on mobile.",
    "Would be great to have more themes.",
    "The logic jumps saved me a lot of time.",
    "Please add a Slack integration!",
    "Exporting to CSV is super handy.",
    "",
    "Keep up the great work.",
    "Onboarding could be a bit clearer.",
]


def _person(rng: random.Random) -> tuple[str, str]:
    first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
    return f"{first} {last}", f"{first}.{last}{rng.randint(1, 99)}@example.com".lower()


def _feedback_answers(rng: random.Random, qs: list[dict]) -> dict:
    name, email = _person(rng)
    features = rng.sample(qs[3]["choices"], rng.randint(1, 3))
    return {
        qs[0]["id"]: name,
        qs[1]["id"]: email,
        qs[2]["id"]: rng.choices([2, 3, 4, 5], weights=[1, 3, 6, 5])[0],
        qs[3]["id"]: [c["id"] for c in features],
        qs[4]["id"]: rng.choice(qs[4]["choices"])["id"],
        qs[5]["id"]: rng.random() < 0.8,
        qs[6]["id"]: rng.choice([1, 3, 5, 8, 12, 25, 40, 120]),
        qs[7]["id"]: rng.choice(COMMENTS),
    }


def _event_answers(rng: random.Random, qs: list[dict]) -> dict:
    name, email = _person(rng)
    attend = rng.random() < 0.7
    answers = {
        qs[0]["id"]: attend,
        qs[5]["id"]: name,
        qs[6]["id"]: email,
        qs[7]["id"]: rng.randint(5, 10),
    }
    if attend:
        answers[qs[1]["id"]] = [rng.choices(qs[1]["choices"], weights=[6, 2, 2])[0]["id"]]
        answers[qs[2]["id"]] = rng.choice(qs[2]["choices"])["id"]
        answers[qs[3]["id"]] = [c["id"] for c in rng.sample(qs[3]["choices"], rng.randint(1, 2))]
    else:
        answers[qs[4]["id"]] = rng.random() < 0.9
    return answers


def _add_responses(db: Session, form: Form, make_answers, rng: random.Random, completed: int, partial: int) -> None:
    questions = {q.id: q for q in form.questions}
    now = utcnow()
    for index in range(completed + partial):
        answers = make_answers(rng)
        path = visible_path(form.questions, answers)
        is_partial = index >= completed
        if is_partial:
            path = path[: rng.randint(1, max(1, len(path) - 2))]
        normalized = {q.id: validate_answer(q, answers.get(q.id), enforce_required=False) for q in path}

        started = now - timedelta(days=rng.uniform(0, 28), minutes=rng.uniform(0, 600))
        response = Response(form_id=form.id, started_at=started, updated_at=started,
                            user_agent="Seed data")
        if not is_partial:
            response.submitted_at = started + timedelta(seconds=rng.randint(35, 280))
        store_answers(response, questions, normalized, replace_all=True)
        db.add(response)
    db.commit()


# ------------------------------------------------------------------- main


def _create(db: Session, owner: User, builder, status: FormStatus) -> tuple[Form, list[dict]]:
    title, settings, questions = builder()
    form = form_service.create_form(db, owner, title)
    payload = FormUpdate(title=title, settings=FormSettings(**settings),
                         questions=[QuestionIn(**q) for q in questions])
    form = form_service.update_form(db, owner, form.id, payload)
    if status == FormStatus.PUBLISHED:
        form = form_service.set_status(db, owner, form.id, status)
    return form, questions


def seed(db: Session) -> None:
    rng = random.Random(42)
    owner = User(name="Demo Creator", email="creator@example.com")
    db.add(owner)
    db.commit()

    feedback, feedback_qs = _create(db, owner, feedback_form, FormStatus.PUBLISHED)
    _add_responses(db, feedback, lambda r: _feedback_answers(r, feedback_qs), rng, completed=34, partial=9)

    event, event_qs = _create(db, owner, event_form, FormStatus.PUBLISHED)
    _add_responses(db, event, lambda r: _event_answers(r, event_qs), rng, completed=21, partial=5)

    _create(db, owner, job_form, FormStatus.DRAFT)


def seed_if_empty(db: Session) -> bool:
    if db.scalar(select(User.id).limit(1)) is not None:
        return False
    seed(db)
    return True


if __name__ == "__main__":
    from .database import Base, SessionLocal, engine

    if "--reset" in sys.argv:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        print("Seeded demo data." if seed_if_empty(session) else "Database already has data; use --reset.")

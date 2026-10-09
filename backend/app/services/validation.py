"""Server-side answer validation.

`validate_answer` turns a raw value sent by the respondent into a
`NormalizedAnswer` ready to be stored, or raises `InvalidAnswer` with a
message in the same wording the respondent UI uses.
"""

import math
import re
from dataclasses import dataclass, field

from ..models import Question
from ..question_types import CHOICE_TYPES, DEFAULT_RATING_STEPS, TEXT_MAX_LENGTH, QuestionType
from ..schemas import AnswerValue

# Deliberately pragmatic: something@something.tld, no spaces.
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


class InvalidAnswer(ValueError):
    pass


@dataclass
class NormalizedAnswer:
    text: str | None = None
    number: float | None = None
    boolean: bool | None = None
    choice_ids: list[str] = field(default_factory=list)


def is_empty(value: AnswerValue) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, list):
        return len(value) == 0
    return False


def validate_answer(question: Question, value: AnswerValue, *, enforce_required: bool = True) -> NormalizedAnswer | None:
    """Validate one answer. Returns None when the question was left empty."""
    if is_empty(value):
        if enforce_required and question.required:
            raise InvalidAnswer("Please fill this in")
        return None

    qtype = QuestionType(question.type)
    props = question.properties or {}

    if qtype in (QuestionType.SHORT_TEXT, QuestionType.LONG_TEXT, QuestionType.EMAIL):
        return _validate_text(qtype, value, props)
    if qtype == QuestionType.NUMBER:
        return _validate_number(value, props)
    if qtype == QuestionType.RATING:
        return _validate_rating(value, props)
    if qtype == QuestionType.YES_NO:
        if not isinstance(value, bool):
            raise InvalidAnswer("Please select Yes or No")
        return NormalizedAnswer(boolean=value)
    if qtype in CHOICE_TYPES:
        return _validate_choices(question, qtype, value, props)
    raise InvalidAnswer("Unsupported question type")  # pragma: no cover - enum is exhaustive


def _validate_text(qtype: QuestionType, value: AnswerValue, props: dict) -> NormalizedAnswer:
    if not isinstance(value, str):
        raise InvalidAnswer("Please enter text")
    text = value.strip()
    limit = props.get("max_length") or TEXT_MAX_LENGTH[qtype]
    if len(text) > limit:
        raise InvalidAnswer(f"Please keep it under {limit} characters")
    if qtype == QuestionType.EMAIL and not EMAIL_RE.match(text):
        raise InvalidAnswer("Hmm... that email doesn't look right")
    return NormalizedAnswer(text=text)


def _to_number(value: AnswerValue) -> float:
    # bool is a subclass of int in Python; a checkbox value is never a number.
    if isinstance(value, bool):
        raise InvalidAnswer("Numbers only please")
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        try:
            number = float(value.strip())
        except ValueError:
            raise InvalidAnswer("Numbers only please") from None
    else:
        raise InvalidAnswer("Numbers only please")
    if not math.isfinite(number):
        raise InvalidAnswer("Numbers only please")
    return number


def _format_number(number: float) -> str:
    return str(int(number)) if number.is_integer() else str(number)


def _validate_number(value: AnswerValue, props: dict) -> NormalizedAnswer:
    number = _to_number(value)
    min_value, max_value = props.get("min_value"), props.get("max_value")
    if min_value is not None and number < min_value:
        raise InvalidAnswer(f"Number must be greater or equal to {_format_number(float(min_value))}")
    if max_value is not None and number > max_value:
        raise InvalidAnswer(f"Number must be lower or equal to {_format_number(float(max_value))}")
    return NormalizedAnswer(number=number)


def _validate_rating(value: AnswerValue, props: dict) -> NormalizedAnswer:
    number = _to_number(value)
    steps = props.get("steps") or DEFAULT_RATING_STEPS
    if not number.is_integer() or not 1 <= number <= steps:
        raise InvalidAnswer(f"Please pick a rating between 1 and {steps}")
    return NormalizedAnswer(number=number)


def _validate_choices(question: Question, qtype: QuestionType, value: AnswerValue, props: dict) -> NormalizedAnswer:
    selected = [value] if isinstance(value, str) else value
    if not isinstance(selected, list) or not all(isinstance(v, str) for v in selected):
        raise InvalidAnswer("Please select an option")
    valid_ids = {choice.id for choice in question.choices}
    # Keep the respondent's order but drop duplicates.
    selected = list(dict.fromkeys(selected))
    if any(choice_id not in valid_ids for choice_id in selected):
        raise InvalidAnswer("Please select one of the available options")
    allow_multiple = qtype == QuestionType.MULTIPLE_CHOICE and props.get("allow_multiple", False)
    if len(selected) > 1 and not allow_multiple:
        raise InvalidAnswer("Please select only one option")
    return NormalizedAnswer(choice_ids=selected)

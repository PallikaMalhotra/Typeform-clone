import pytest

from app.models import Choice, Question
from app.services.validation import InvalidAnswer, validate_answer


def q(type_, required=False, **props):
    question = Question(id="q", type=type_, required=required, properties=props)
    question.choices = [Choice(id="a", label="A", position=0), Choice(id="b", label="B", position=1)]
    return question


@pytest.mark.parametrize(
    ("question", "value", "message"),
    [
        (q("short_text", required=True), "   ", "Please fill this in"),
        (q("email"), "missing-at.com", "that email doesn't look right"),
        (q("number"), "12abc", "Numbers only please"),
        (q("number"), True, "Numbers only please"),
        (q("number", min_value=5), 4, "greater or equal to 5"),
        (q("rating", steps=5), 6, "between 1 and 5"),
        (q("rating", steps=5), 2.5, "between 1 and 5"),
        (q("yes_no"), "yes", "Yes or No"),
        (q("multiple_choice"), ["a", "b"], "only one"),
        (q("dropdown"), "zzz", "available options"),
        (q("short_text", max_length=3), "abcd", "under 3 characters"),
    ],
)
def test_invalid_answers(question, value, message):
    with pytest.raises(InvalidAnswer, match=message):
        validate_answer(question, value)


def test_valid_answers_are_normalized():
    assert validate_answer(q("short_text"), "  hi  ").text == "hi"
    assert validate_answer(q("number"), "3.5").number == 3.5
    assert validate_answer(q("yes_no"), False).boolean is False
    assert validate_answer(q("multiple_choice", allow_multiple=True), ["b", "a", "b"]).choice_ids == ["b", "a"]
    assert validate_answer(q("dropdown"), "a").choice_ids == ["a"]
    assert validate_answer(q("email"), "", enforce_required=False) is None

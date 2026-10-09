"""Logic jumps: decide which question comes next.

The frontend mirrors this file in `src/lib/logic.ts`, so the path the
respondent sees and the path the server validates are always the same.
"""

from collections.abc import Mapping, Sequence

from ..models import LogicRule, Question
from ..question_types import CHOICE_TYPES, NUMERIC_TYPES, LogicOperator, QuestionType
from ..schemas import AnswerValue
from .validation import is_empty

END = "__end__"


def _as_float(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def rule_matches(question: Question, rule: LogicRule, answer: AnswerValue) -> bool:
    if is_empty(answer):
        return False
    operator = LogicOperator(rule.operator)
    qtype = QuestionType(question.type)

    if qtype in CHOICE_TYPES:
        selected = [answer] if isinstance(answer, str) else answer
        is_selected = isinstance(selected, list) and rule.value in selected
        if operator == LogicOperator.IS:
            return is_selected
        if operator == LogicOperator.IS_NOT:
            return not is_selected
        return False

    if qtype == QuestionType.YES_NO:
        expected = rule.value == "true"
        if operator == LogicOperator.IS:
            return answer is expected
        if operator == LogicOperator.IS_NOT:
            return answer is not expected
        return False

    if qtype in NUMERIC_TYPES:
        left, right = _as_float(answer), _as_float(rule.value)
        if left is None or right is None:
            return False
        return {
            LogicOperator.IS: left == right,
            LogicOperator.IS_NOT: left != right,
            LogicOperator.GREATER_THAN: left > right,
            LogicOperator.LOWER_THAN: left < right,
        }[operator]

    return False


def next_question_id(
    questions: Sequence[Question], index: int, answers: Mapping[str, AnswerValue]
) -> str | None:
    """Id of the question after questions[index], END, or None past the last one."""
    question = questions[index]
    answer = answers.get(question.id)
    position = {q.id: i for i, q in enumerate(questions)}
    for rule in question.logic_rules:
        if rule_matches(question, rule, answer):
            if rule.destination_question_id is None:
                return END
            target = position.get(rule.destination_question_id)
            # Only forward jumps are allowed, which makes loops impossible.
            if target is not None and target > index:
                return rule.destination_question_id
    return questions[index + 1].id if index + 1 < len(questions) else None


def visible_path(questions: Sequence[Question], answers: Mapping[str, AnswerValue]) -> list[Question]:
    """The questions a respondent goes through, given their answers."""
    position = {q.id: i for i, q in enumerate(questions)}
    path: list[Question] = []
    index: int | None = 0 if questions else None
    while index is not None:
        path.append(questions[index])
        next_id = next_question_id(questions, index, answers)
        index = None if next_id in (None, END) else position[next_id]
    return path

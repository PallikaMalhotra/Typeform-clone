"""The supported question types and the groups the rest of the code relies on."""

from enum import StrEnum


class QuestionType(StrEnum):
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    MULTIPLE_CHOICE = "multiple_choice"
    DROPDOWN = "dropdown"
    EMAIL = "email"
    NUMBER = "number"
    YES_NO = "yes_no"
    RATING = "rating"


# Types whose options live in the question_choices table.
CHOICE_TYPES = frozenset({QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN})
TEXT_TYPES = frozenset({QuestionType.SHORT_TEXT, QuestionType.LONG_TEXT, QuestionType.EMAIL})
NUMERIC_TYPES = frozenset({QuestionType.NUMBER, QuestionType.RATING})
# Types a logic jump can branch on.
LOGIC_TYPES = CHOICE_TYPES | NUMERIC_TYPES | {QuestionType.YES_NO}


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class LogicOperator(StrEnum):
    IS = "is"
    IS_NOT = "is_not"
    GREATER_THAN = "greater_than"
    LOWER_THAN = "lower_than"


DEFAULT_RATING_STEPS = 5
TEXT_MAX_LENGTH = {
    QuestionType.SHORT_TEXT: 1_000,
    QuestionType.LONG_TEXT: 10_000,
    QuestionType.EMAIL: 320,
}

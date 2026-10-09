"""Pydantic models: the API's request and response shapes."""

from datetime import UTC, datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from .question_types import FormStatus, LogicOperator, QuestionType


def _as_utc(value: datetime) -> datetime:
    # SQLite drops timezone info; every timestamp we store is UTC.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


UTCDateTime = Annotated[datetime, AfterValidator(_as_utc)]
Id = Annotated[str, StringConstraints(min_length=1, max_length=36, pattern=r"^[A-Za-z0-9-]+$")]
HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9A-Fa-f]{6}$")]
Title = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- settings


class ThemeSettings(BaseModel):
    background: HexColor = "#FFFFFF"
    question: HexColor = "#191919"
    answer: HexColor = "#0445AF"
    button: HexColor = "#0445AF"
    button_text: HexColor = "#FFFFFF"
    font: Annotated[str, StringConstraints(max_length=64)] = "Inter"


class WelcomeScreen(BaseModel):
    enabled: bool = False
    title: Annotated[str, StringConstraints(max_length=500)] = "Hey there 👋"
    description: Annotated[str, StringConstraints(max_length=2000)] = ""
    button_text: Annotated[str, StringConstraints(max_length=40)] = "Start"


class ThankYouScreen(BaseModel):
    title: Annotated[str, StringConstraints(max_length=500)] = "Thanks for completing this form"
    description: Annotated[str, StringConstraints(max_length=2000)] = "Now create your own — it's free, easy & beautiful"
    button_text: Annotated[str, StringConstraints(max_length=40)] = ""
    button_url: Annotated[str, StringConstraints(max_length=2000)] = ""


class FormSettings(BaseModel):
    theme: ThemeSettings = Field(default_factory=ThemeSettings)
    welcome: WelcomeScreen = Field(default_factory=WelcomeScreen)
    thank_you: ThankYouScreen = Field(default_factory=ThankYouScreen)


# --------------------------------------------------------------- questions


class QuestionProperties(BaseModel):
    """Type-specific options. Unused fields are ignored for other types."""

    allow_multiple: bool = False  # multiple_choice
    steps: int = Field(default=5, ge=3, le=10)  # rating
    shape: Annotated[str, StringConstraints(pattern=r"^(star|number)$")] = "star"  # rating
    min_value: float | None = None  # number
    max_value: float | None = None  # number
    max_length: int | None = Field(default=None, ge=1, le=10_000)  # text types


class ChoiceIn(BaseModel):
    id: Id
    label: Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]


class ChoiceOut(ORMModel):
    id: str
    label: str


class LogicRuleIn(BaseModel):
    operator: LogicOperator
    value: Annotated[str, StringConstraints(max_length=255)]
    destination_id: Id | None = None  # None = jump to the thank-you screen


class LogicRuleOut(ORMModel):
    operator: LogicOperator
    value: str
    destination_id: str | None = Field(validation_alias="destination_question_id")


class QuestionIn(BaseModel):
    id: Id
    type: QuestionType
    title: Annotated[str, StringConstraints(max_length=1000)] = ""
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None
    required: bool = False
    properties: QuestionProperties = Field(default_factory=QuestionProperties)
    choices: list[ChoiceIn] = Field(default_factory=list, max_length=200)
    logic: list[LogicRuleIn] = Field(default_factory=list, max_length=50)


class QuestionOut(ORMModel):
    id: str
    type: QuestionType
    title: str
    description: str | None
    required: bool
    properties: QuestionProperties
    choices: list[ChoiceOut]
    logic: list[LogicRuleOut] = Field(validation_alias="logic_rules")


# ------------------------------------------------------------------- forms


class FormCreate(BaseModel):
    title: Title = "My new form"


class FormRename(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class FormUpdate(BaseModel):
    """Full definition sent by the builder's autosave."""

    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    settings: FormSettings
    questions: list[QuestionIn] = Field(max_length=200)


class FormSummary(ORMModel):
    """A row of the workspace form list."""

    id: str
    title: str
    slug: str
    status: FormStatus
    theme: ThemeSettings  # lets the workspace tint each form's thumbnail
    question_count: int
    response_count: int
    created_at: UTCDateTime
    updated_at: UTCDateTime
    published_at: UTCDateTime | None


class FormDetail(ORMModel):
    id: str
    title: str
    slug: str
    status: FormStatus
    settings: FormSettings
    questions: list[QuestionOut]
    response_count: int = 0
    created_at: UTCDateTime
    updated_at: UTCDateTime
    published_at: UTCDateTime | None


class PublicForm(ORMModel):
    """What a respondent receives: the definition without creator metadata."""

    slug: str
    title: str
    settings: FormSettings
    questions: list[QuestionOut]


# --------------------------------------------------------------- responses

# Answer values as sent by the respondent, keyed by question id:
# str (text/email), number (number/rating), bool (yes/no), list[str] of choice ids.
AnswerValue = str | int | float | bool | list[str] | None


class AnswersIn(BaseModel):
    answers: dict[Id, AnswerValue] = Field(default_factory=dict, max_length=200)


class ResponseStarted(BaseModel):
    id: str


class FieldError(BaseModel):
    question_id: str
    message: str


class AnswerOut(BaseModel):
    question_id: str
    value: Any  # the same shape the respondent submitted
    display: str  # human readable, e.g. choice labels joined by ", "


class ResponseOut(BaseModel):
    id: str
    started_at: UTCDateTime
    submitted_at: UTCDateTime | None
    completed: bool
    answers: list[AnswerOut]


class ResponseList(BaseModel):
    total: int
    items: list[ResponseOut]


# ----------------------------------------------------------------- summary


class ChoiceStat(BaseModel):
    label: str
    count: int
    percentage: float


class QuestionSummary(BaseModel):
    question_id: str
    title: str
    type: QuestionType
    answered: int  # completed responses that answered this question
    choices: list[ChoiceStat] | None = None  # choice, yes/no and rating questions
    average: float | None = None  # number and rating
    minimum: float | None = None
    maximum: float | None = None
    latest: list[str] | None = None  # text questions: most recent answers


class FormInsights(BaseModel):
    starts: int
    submissions: int
    completion_rate: float  # 0-100
    average_time_seconds: float | None


class FormSummaryStats(BaseModel):
    insights: FormInsights
    questions: list[QuestionSummary]

// Shapes shared with the FastAPI backend (see backend/app/schemas.py).

export type QuestionType =
  "short_text" | "long_text" | "multiple_choice" | "dropdown" | "email" | "number" | "yes_no" | "rating";

export type FormStatus = "draft" | "published";
export type LogicOperator = "is" | "is_not" | "greater_than" | "lower_than";

export interface Theme {
  background: string;
  question: string;
  answer: string;
  button: string;
  button_text: string;
  font: string;
}

export interface WelcomeScreen {
  enabled: boolean;
  title: string;
  description: string;
  button_text: string;
}

export interface ThankYouScreen {
  title: string;
  description: string;
  button_text: string;
  button_url: string;
}

export interface FormSettings {
  theme: Theme;
  welcome: WelcomeScreen;
  thank_you: ThankYouScreen;
}

export interface QuestionProperties {
  allow_multiple: boolean;
  steps: number;
  shape: "star" | "number";
  min_value: number | null;
  max_value: number | null;
  max_length: number | null;
}

export interface Choice {
  id: string;
  label: string;
}

export interface LogicRule {
  operator: LogicOperator;
  value: string;
  /** null = jump to the thank-you screen */
  destination_id: string | null;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  properties: QuestionProperties;
  choices: Choice[];
  logic: LogicRule[];
}

/** Everything the respondent flow needs to render a form. */
export interface FormDefinition {
  title: string;
  settings: FormSettings;
  questions: Question[];
}

export interface Form extends FormDefinition {
  id: string;
  slug: string;
  status: FormStatus;
  response_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface PublicForm extends FormDefinition {
  slug: string;
}

export interface FormListItem {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  theme: Theme;
  question_count: number;
  response_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/** str (text, email), number (number, rating), boolean (yes/no), string[] (choice ids). */
export type AnswerValue = string | number | boolean | string[] | null;
export type Answers = Record<string, AnswerValue>;

export interface ResponseAnswer {
  question_id: string;
  value: AnswerValue;
  display: string;
}

export interface FormResponse {
  id: string;
  started_at: string;
  submitted_at: string | null;
  completed: boolean;
  answers: ResponseAnswer[];
}

export interface ResponseList {
  total: number;
  items: FormResponse[];
}

export interface ChoiceStat {
  label: string;
  count: number;
  percentage: number;
}

export interface QuestionSummary {
  question_id: string;
  title: string;
  type: QuestionType;
  answered: number;
  choices: ChoiceStat[] | null;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  latest: string[] | null;
}

export interface FormSummaryStats {
  insights: {
    starts: number;
    submissions: number;
    completion_rate: number;
    average_time_seconds: number | null;
  };
  questions: QuestionSummary[];
}

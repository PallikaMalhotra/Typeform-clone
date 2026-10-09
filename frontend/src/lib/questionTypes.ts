// Metadata for each question type: label, colour and defaults used by the builder.

import { newId } from "./id";
import type { Question, QuestionProperties, QuestionType } from "./types";

export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  /** Colour of the type badge, as in Typeform's builder. */
  color: string;
  group: "Text" | "Choice" | "Contact info" | "Rating & ranking" | "Other";
  description: string;
}

export const QUESTION_TYPES: QuestionTypeMeta[] = [
  { type: "short_text", label: "Short Text", color: "#3D7EF5", group: "Text", description: "A single line answer" },
  { type: "long_text", label: "Long Text", color: "#3D7EF5", group: "Text", description: "Room for longer answers" },
  {
    type: "multiple_choice",
    label: "Multiple Choice",
    color: "#8566E5",
    group: "Choice",
    description: "Pick one or many options",
  },
  { type: "dropdown", label: "Dropdown", color: "#8566E5", group: "Choice", description: "Pick from a long list" },
  { type: "yes_no", label: "Yes/No", color: "#8566E5", group: "Choice", description: "A quick yes or no" },
  { type: "email", label: "Email", color: "#E2627D", group: "Contact info", description: "Collect a valid email" },
  { type: "number", label: "Number", color: "#0E9F8F", group: "Other", description: "Numbers only, with limits" },
  {
    type: "rating",
    label: "Rating",
    color: "#E9A23B",
    group: "Rating & ranking",
    description: "Stars or a number scale",
  },
];

export const TYPE_META = Object.fromEntries(QUESTION_TYPES.map((m) => [m.type, m])) as Record<
  QuestionType,
  QuestionTypeMeta
>;

/** Placeholder types shown in the "Add content" dialog as "Coming soon". */
export const COMING_SOON_TYPES = [
  { label: "File Upload", color: "#5A6A85" },
  { label: "Payment", color: "#5A6A85" },
  { label: "Date", color: "#5A6A85" },
  { label: "Phone Number", color: "#E2627D" },
  { label: "Ranking", color: "#E9A23B" },
  { label: "Opinion Scale", color: "#E9A23B" },
];

export const DEFAULT_PROPERTIES: QuestionProperties = {
  allow_multiple: false,
  steps: 5,
  shape: "star",
  min_value: null,
  max_value: null,
  max_length: null,
};

export const isChoiceType = (type: QuestionType) => type === "multiple_choice" || type === "dropdown";

export function createQuestion(type: QuestionType): Question {
  const choices = isChoiceType(type) ? ["Choice 1", "Choice 2"].map((label) => ({ id: newId(), label })) : [];
  return {
    id: newId(),
    type,
    title: "",
    description: null,
    required: false,
    properties: { ...DEFAULT_PROPERTIES },
    choices,
    logic: [],
  };
}

/** Change a question's type, keeping whatever still makes sense. */
export function changeQuestionType(question: Question, type: QuestionType): Question {
  const fresh = createQuestion(type);
  return {
    ...question,
    type,
    choices: isChoiceType(type) ? (question.choices.length ? question.choices : fresh.choices) : [],
    // Rules are written against the old type's values; they no longer apply.
    logic: [],
    properties: {
      ...question.properties,
      allow_multiple: type === "multiple_choice" && question.properties.allow_multiple,
    },
  };
}

export const choiceKey = (index: number) => String.fromCharCode(65 + (index % 26));

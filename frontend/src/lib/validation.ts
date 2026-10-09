// Client-side answer validation. Mirrors backend/app/services/validation.py,
// which remains the source of truth (the server re-validates on submit).

import type { AnswerValue, Question } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEXT_MAX_LENGTH: Partial<Record<Question["type"], number>> = {
  short_text: 1000,
  long_text: 10000,
  email: 320,
};

export function isEmpty(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Returns an error message, or null when the answer is valid. */
export function validateAnswer(question: Question, value: AnswerValue | undefined): string | null {
  if (isEmpty(value)) return question.required ? "Please fill this in" : null;
  const props = question.properties;

  switch (question.type) {
    case "short_text":
    case "long_text":
    case "email": {
      if (typeof value !== "string") return "Please enter text";
      const text = value.trim();
      const limit = props.max_length ?? TEXT_MAX_LENGTH[question.type]!;
      if (text.length > limit) return `Please keep it under ${limit} characters`;
      if (question.type === "email" && !EMAIL_RE.test(text)) return "Hmm... that email doesn't look right";
      return null;
    }
    case "number": {
      const n = typeof value === "boolean" ? NaN : Number(value);
      if (!Number.isFinite(n)) return "Numbers only please";
      if (props.min_value !== null && n < props.min_value)
        return `Number must be greater or equal to ${props.min_value}`;
      if (props.max_value !== null && n > props.max_value) return `Number must be lower or equal to ${props.max_value}`;
      return null;
    }
    case "rating": {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > props.steps) return `Please pick a rating between 1 and ${props.steps}`;
      return null;
    }
    case "yes_no":
      return typeof value === "boolean" ? null : "Please select Yes or No";
    case "multiple_choice":
    case "dropdown": {
      const selected = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
      const ids = new Set(question.choices.map((c) => c.id));
      if (!selected.every((id) => ids.has(id))) return "Please select one of the available options";
      if (selected.length > 1 && !(question.type === "multiple_choice" && props.allow_multiple))
        return "Please select only one option";
      return null;
    }
  }
}

// Logic jumps. Mirrors backend/app/services/logic.py so the client walks the
// exact path the server will validate.

import { isEmpty } from "./validation";
import type { AnswerValue, Answers, LogicRule, Question } from "./types";

export const END = "__end__";

const CHOICE_TYPES = new Set(["multiple_choice", "dropdown"]);
const NUMERIC_TYPES = new Set(["number", "rating"]);

/** Question types a logic jump can branch on. */
export const LOGIC_TYPES = new Set(["multiple_choice", "dropdown", "yes_no", "number", "rating"]);

function asNumber(value: unknown): number | null {
  if (typeof value === "boolean" || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function ruleMatches(question: Question, rule: LogicRule, answer: AnswerValue | undefined): boolean {
  if (answer === undefined || isEmpty(answer)) return false;

  if (CHOICE_TYPES.has(question.type)) {
    const selected = typeof answer === "string" ? [answer] : Array.isArray(answer) ? answer : [];
    const isSelected = selected.includes(rule.value);
    if (rule.operator === "is") return isSelected;
    if (rule.operator === "is_not") return !isSelected;
    return false;
  }

  if (question.type === "yes_no") {
    const expected = rule.value === "true";
    if (rule.operator === "is") return answer === expected;
    if (rule.operator === "is_not") return answer !== expected;
    return false;
  }

  if (NUMERIC_TYPES.has(question.type)) {
    const left = asNumber(answer);
    const right = asNumber(rule.value);
    if (left === null || right === null) return false;
    switch (rule.operator) {
      case "is":
        return left === right;
      case "is_not":
        return left !== right;
      case "greater_than":
        return left > right;
      case "lower_than":
        return left < right;
    }
  }
  return false;
}

/** Id of the question after questions[index], END, or null past the last one. */
export function nextQuestionId(questions: Question[], index: number, answers: Answers): string | null {
  const question = questions[index];
  const answer = answers[question.id];
  for (const rule of question.logic) {
    if (!ruleMatches(question, rule, answer)) continue;
    if (rule.destination_id === null) return END;
    const target = questions.findIndex((q) => q.id === rule.destination_id);
    // Only forward jumps are allowed, which makes loops impossible.
    if (target > index) return rule.destination_id;
  }
  return index + 1 < questions.length ? questions[index + 1].id : null;
}

/** The questions a respondent goes through, given their answers. */
export function visiblePath(questions: Question[], answers: Answers): Question[] {
  const path: Question[] = [];
  let index = questions.length ? 0 : -1;
  while (index >= 0) {
    path.push(questions[index]);
    const next = nextQuestionId(questions, index, answers);
    index = next === null || next === END ? -1 : questions.findIndex((q) => q.id === next);
  }
  return path;
}

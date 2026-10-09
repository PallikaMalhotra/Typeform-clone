// Pure helpers that transform a form definition. The builder calls these
// through `update(...)`; keeping them pure makes them easy to reason about.

import { newId } from "./id";
import type { FormDefinition, Question } from "./types";

export function updateQuestion(def: FormDefinition, id: string, change: (q: Question) => Question): FormDefinition {
  return { ...def, questions: def.questions.map((q) => (q.id === id ? change(q) : q)) };
}

/** Insert after `afterId`, or at the end when it is null/unknown. */
export function insertQuestion(def: FormDefinition, question: Question, afterId: string | null): FormDefinition {
  const index = afterId ? def.questions.findIndex((q) => q.id === afterId) : -1;
  const questions = [...def.questions];
  questions.splice(index === -1 ? questions.length : index + 1, 0, question);
  return { ...def, questions };
}

/** Insert a copy (with id `copyId`) after the original; logic values that referenced old choices are remapped. */
export function duplicateQuestion(def: FormDefinition, id: string, copyId: string): FormDefinition {
  const source = def.questions.find((q) => q.id === id);
  if (!source) return def;
  const choiceMap = new Map(source.choices.map((c) => [c.id, newId()]));
  const copy: Question = {
    ...source,
    id: copyId,
    choices: source.choices.map((c) => ({ ...c, id: choiceMap.get(c.id)! })),
    logic: source.logic.map((rule) => ({ ...rule, value: choiceMap.get(rule.value) ?? rule.value })),
  };
  return insertQuestion(def, copy, id);
}

/** Remove a question and every logic rule that jumped to it. */
export function deleteQuestion(def: FormDefinition, id: string): FormDefinition {
  return {
    ...def,
    questions: def.questions
      .filter((q) => q.id !== id)
      .map((q) => ({ ...q, logic: q.logic.filter((rule) => rule.destination_id !== id) })),
  };
}

/**
 * Move a question. Jumps may only go forward, so rules that would now point
 * backwards (or to the question itself) are dropped.
 */
export function moveQuestion(def: FormDefinition, from: number, to: number): FormDefinition {
  const questions = [...def.questions];
  const [moved] = questions.splice(from, 1);
  questions.splice(to, 0, moved);
  const position = new Map(questions.map((q, i) => [q.id, i]));
  return {
    ...def,
    questions: questions.map((q, i) => ({
      ...q,
      logic: q.logic.filter((rule) => rule.destination_id === null || (position.get(rule.destination_id) ?? -1) > i),
    })),
  };
}

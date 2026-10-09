"use client";

import { Icon } from "@/components/ui/Icon";
import { END, LOGIC_TYPES } from "@/lib/logic";
import type { LogicOperator, LogicRule, Question } from "@/lib/types";
import styles from "./builder.module.css";

interface LogicSettingsProps {
  question: Question;
  questions: Question[];
  onChange: (change: (q: Question) => Question) => void;
}

const NUMERIC = new Set(["number", "rating"]);

const OPERATORS: { value: LogicOperator; label: string; numericOnly?: boolean }[] = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "greater_than", label: "is greater than", numericOnly: true },
  { value: "lower_than", label: "is lower than", numericOnly: true },
];

function valueOptions(question: Question): { value: string; label: string }[] | null {
  if (question.type === "yes_no")
    return [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ];
  if (question.type === "multiple_choice" || question.type === "dropdown")
    return question.choices.map((c, i) => ({ value: c.id, label: c.label || `Choice ${i + 1}` }));
  if (question.type === "rating")
    return Array.from({ length: question.properties.steps }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1),
    }));
  return null; // number: free input
}

/** Logic jumps for one question: "If answer <op> <value>, go to <destination>". */
export function LogicSettings({ question, questions, onChange }: LogicSettingsProps) {
  if (!LOGIC_TYPES.has(question.type)) {
    return (
      <p className={styles.muted}>
        Logic jumps can branch on Multiple Choice, Dropdown, Yes/No, Number and Rating questions. Select one of those to
        add a jump.
      </p>
    );
  }

  const index = questions.findIndex((q) => q.id === question.id);
  // Jumps only go forward, which keeps forms free of loops.
  const destinations = questions.slice(index + 1);
  const options = valueOptions(question);
  const operators = OPERATORS.filter((o) => !o.numericOnly || NUMERIC.has(question.type));

  const setRules = (logic: LogicRule[]) => onChange((q) => ({ ...q, logic }));
  const patchRule = (i: number, patch: Partial<LogicRule>) =>
    setRules(question.logic.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const addRule = () =>
    setRules([
      ...question.logic,
      {
        operator: "is",
        value: options?.[0]?.value ?? "0",
        destination_id: destinations[1]?.id ?? null,
      },
    ]);

  return (
    <>
      <p className={styles.muted}>
        Send respondents to a different question based on their answer. Rules are checked top to bottom.
      </p>

      {question.logic.map((rule, i) => (
        <div key={i} className={styles.ruleCard}>
          <div className={styles.ruleHead}>
            Rule {i + 1}
            <button
              className="icon-btn"
              onClick={() => setRules(question.logic.filter((_, j) => j !== i))}
              aria-label={`Delete rule ${i + 1}`}
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
          <label className="field">
            <span className="field-label">If the answer</span>
            <select
              className="select"
              value={rule.operator}
              onChange={(e) => patchRule(i, { operator: e.target.value as LogicOperator })}
            >
              {operators.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {options ? (
            <select
              className="select"
              value={rule.value}
              onChange={(e) => patchRule(i, { value: e.target.value })}
              aria-label="Value"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              type="number"
              value={rule.value}
              onChange={(e) => patchRule(i, { value: e.target.value })}
              aria-label="Value"
            />
          )}
          <label className="field">
            <span className="field-label">Then go to</span>
            <select
              className="select"
              value={rule.destination_id ?? END}
              onChange={(e) => patchRule(i, { destination_id: e.target.value === END ? null : e.target.value })}
            >
              {destinations.map((q) => (
                <option key={q.id} value={q.id}>
                  {questions.indexOf(q) + 1}. {q.title || "Untitled question"}
                </option>
              ))}
              <option value={END}>Thank you screen</option>
            </select>
          </label>
        </div>
      ))}

      <button className="btn btn-sm btn-secondary" onClick={addRule}>
        <Icon name="plus" size={14} /> Add rule
      </button>
      <p className={styles.muted}>
        <Icon name="arrowRight" size={13} /> In all other cases, go to the next question.
      </p>
      <p className={styles.muted}>
        Calculations, variables and hidden fields <span className="badge badge-soon">Coming soon</span>
      </p>
    </>
  );
}

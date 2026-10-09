"use client";

import { Icon } from "@/components/ui/Icon";
import { Toggle } from "@/components/ui/Toggle";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { newId } from "@/lib/id";
import { changeQuestionType, choiceKey, isChoiceType, QUESTION_TYPES } from "@/lib/questionTypes";
import type { Question, QuestionProperties, QuestionType } from "@/lib/types";
import styles from "./builder.module.css";

interface QuestionSettingsProps {
  question: Question;
  onChange: (change: (q: Question) => Question) => void;
}

const parseOptionalNumber = (raw: string): number | null =>
  raw.trim() === "" || !Number.isFinite(Number(raw)) ? null : Number(raw);

export function QuestionSettings({ question, onChange }: QuestionSettingsProps) {
  const setProps = (patch: Partial<QuestionProperties>) =>
    onChange((q) => ({ ...q, properties: { ...q.properties, ...patch } }));
  const { properties: props } = question;
  const isText = question.type === "short_text" || question.type === "long_text";

  return (
    <>
      <div className={styles.group}>
        <div className={styles.groupTitle}>Question type</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TypeBadge type={question.type} />
          <select
            className="select"
            value={question.type}
            onChange={(e) => onChange((q) => changeQuestionType(q, e.target.value as QuestionType))}
            aria-label="Question type"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Settings</div>
        <div className={styles.row}>
          Required
          <Toggle
            label="Required"
            checked={question.required}
            onChange={(required) => onChange((q) => ({ ...q, required }))}
          />
        </div>
        {question.type === "multiple_choice" && (
          <div className={styles.row}>
            Multiple selection
            <Toggle
              label="Multiple selection"
              checked={props.allow_multiple}
              onChange={(allow_multiple) => setProps({ allow_multiple })}
            />
          </div>
        )}
        {isText && (
          <div className={styles.row}>
            Max characters
            <Toggle
              label="Max characters"
              checked={props.max_length !== null}
              onChange={(on) => setProps({ max_length: on ? (question.type === "short_text" ? 100 : 1000) : null })}
            />
          </div>
        )}
        {isText && props.max_length !== null && (
          <input
            className="input"
            type="number"
            min={1}
            max={10000}
            value={props.max_length}
            onChange={(e) => setProps({ max_length: Math.min(10000, Math.max(1, Number(e.target.value) || 1)) })}
            aria-label="Maximum characters"
          />
        )}
      </div>

      <label className={`field ${styles.group}`}>
        <span className={styles.groupTitle}>Description</span>
        <textarea
          className="textarea"
          placeholder="Add helper text for respondents"
          value={question.description ?? ""}
          onChange={(e) => onChange((q) => ({ ...q, description: e.target.value || null }))}
        />
      </label>

      {isChoiceType(question.type) && (
        <div className={styles.group}>
          <div className={styles.groupTitle}>Choices</div>
          {question.choices.map((choice, index) => (
            <div key={choice.id} className={styles.choiceRow}>
              <span className={styles.choiceKey}>
                {question.type === "multiple_choice" ? choiceKey(index) : index + 1}
              </span>
              <input
                className="input"
                value={choice.label}
                placeholder={`Choice ${index + 1}`}
                aria-label={`Choice ${index + 1}`}
                onChange={(e) =>
                  onChange((q) => ({
                    ...q,
                    choices: q.choices.map((c) => (c.id === choice.id ? { ...c, label: e.target.value } : c)),
                  }))
                }
              />
              <button
                className="icon-btn"
                aria-label={`Remove choice ${index + 1}`}
                disabled={question.choices.length <= 1}
                onClick={() =>
                  onChange((q) => ({
                    ...q,
                    choices: q.choices.filter((c) => c.id !== choice.id),
                    logic: q.logic.filter((rule) => rule.value !== choice.id),
                  }))
                }
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
          <button
            className="btn btn-sm btn-secondary"
            onClick={() =>
              onChange((q) => ({
                ...q,
                choices: [...q.choices, { id: newId(), label: `Choice ${q.choices.length + 1}` }],
              }))
            }
          >
            <Icon name="plus" size={14} /> Add choice
          </button>
        </div>
      )}

      {question.type === "rating" && (
        <div className={styles.group}>
          <div className={styles.groupTitle}>Rating</div>
          <div className={styles.inline}>
            <label className="field">
              <span className="field-label">Steps</span>
              <select
                className="select"
                value={props.steps}
                onChange={(e) => setProps({ steps: Number(e.target.value) })}
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Shape</span>
              <select
                className="select"
                value={props.shape}
                onChange={(e) => setProps({ shape: e.target.value as QuestionProperties["shape"] })}
              >
                <option value="star">Stars</option>
                <option value="number">Numbers</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {question.type === "number" && (
        <div className={styles.group}>
          <div className={styles.groupTitle}>Limits</div>
          <div className={styles.inline}>
            <label className="field">
              <span className="field-label">Min number</span>
              <input
                className="input"
                type="number"
                value={props.min_value ?? ""}
                placeholder="None"
                onChange={(e) => setProps({ min_value: parseOptionalNumber(e.target.value) })}
              />
            </label>
            <label className="field">
              <span className="field-label">Max number</span>
              <input
                className="input"
                type="number"
                value={props.max_value ?? ""}
                placeholder="None"
                onChange={(e) => setProps({ max_value: parseOptionalNumber(e.target.value) })}
              />
            </label>
          </div>
        </div>
      )}
    </>
  );
}

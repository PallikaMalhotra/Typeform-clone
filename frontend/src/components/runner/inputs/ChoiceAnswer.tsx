"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { choiceKey } from "@/lib/questionTypes";
import type { AnswerInputProps } from "./types";
import { useShortcutKeys } from "./useShortcutKeys";
import styles from "../runner.module.css";

export const COMMIT_DELAY_MS = 450;

/** Multiple choice: single select advances on click, multi select waits for OK. */
export function ChoiceAnswer({ question, value, onChange, onCommit, interactive, editing }: AnswerInputProps) {
  const selected = Array.isArray(value) ? value : [];
  const multiple = question.properties.allow_multiple;
  const [blinking, setBlinking] = useState<string | null>(null);

  const toggle = (id: string) => {
    if (!interactive) return;
    if (multiple) {
      onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
      return;
    }
    onChange([id]);
    setBlinking(id);
    setTimeout(() => {
      setBlinking(null);
      onCommit();
    }, COMMIT_DELAY_MS);
  };

  useShortcutKeys(interactive, (key) => {
    const choice = question.choices[key.charCodeAt(0) - 65];
    if (!choice) return false;
    toggle(choice.id);
    return true;
  });

  return (
    <div>
      {multiple && <p className={styles.hint}>Choose as many as you like</p>}
      <div className={styles.choices} role={multiple ? "group" : "radiogroup"}>
        {question.choices.map((choice, index) => {
          const isSelected = selected.includes(choice.id);
          const className = [styles.choice, isSelected && styles.selected, blinking === choice.id && styles.blink]
            .filter(Boolean)
            .join(" ");
          if (editing) {
            return (
              <div key={choice.id} className={className}>
                <span className={styles.key}>{choiceKey(index)}</span>
                <input
                  className={styles.choiceEdit}
                  value={choice.label}
                  placeholder={`Choice ${index + 1}`}
                  onChange={(e) => editing.onLabelChange(choice.id, e.target.value)}
                  aria-label={`Choice ${index + 1}`}
                />
                {question.choices.length > 1 && (
                  <button
                    className={styles.choiceRemove}
                    onClick={() => editing.onRemove(choice.id)}
                    aria-label="Remove choice"
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            );
          }
          return (
            <button
              key={choice.id}
              type="button"
              className={className}
              onClick={() => toggle(choice.id)}
              role={multiple ? "checkbox" : "radio"}
              aria-checked={isSelected}
              tabIndex={interactive ? 0 : -1}
            >
              <span className={styles.key}>{choiceKey(index)}</span>
              <span className={styles.choiceLabel}>{choice.label || `Choice ${index + 1}`}</span>
              {isSelected && (
                <span className={styles.check}>
                  <Icon name="check" size={20} strokeWidth={2.4} />
                </span>
              )}
            </button>
          );
        })}
        {editing && (
          <button className={styles.addChoice} onClick={editing.onAdd}>
            Add choice
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { COMMIT_DELAY_MS } from "./ChoiceAnswer";
import type { AnswerInputProps } from "./types";
import { useShortcutKeys } from "./useShortcutKeys";
import styles from "../runner.module.css";

const OPTIONS = [
  { value: true, label: "Yes", key: "Y" },
  { value: false, label: "No", key: "N" },
];

export function YesNoAnswer({ value, onChange, onCommit, interactive }: AnswerInputProps) {
  const [blinking, setBlinking] = useState<boolean | null>(null);

  const pick = (choice: boolean) => {
    if (!interactive) return;
    onChange(choice);
    setBlinking(choice);
    setTimeout(() => {
      setBlinking(null);
      onCommit();
    }, COMMIT_DELAY_MS);
  };

  useShortcutKeys(interactive, (key) => {
    const option = OPTIONS.find((o) => o.key === key);
    if (!option) return false;
    pick(option.value);
    return true;
  });

  return (
    <div className={styles.yesNo} role="radiogroup">
      {OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={interactive ? 0 : -1}
            className={[styles.choice, isSelected && styles.selected, blinking === option.value && styles.blink]
              .filter(Boolean)
              .join(" ")}
            onClick={() => pick(option.value)}
          >
            <span className={styles.key}>{option.key}</span>
            <span className={styles.choiceLabel}>{option.label}</span>
            {isSelected && (
              <span className={styles.check}>
                <Icon name="check" size={20} strokeWidth={2.4} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

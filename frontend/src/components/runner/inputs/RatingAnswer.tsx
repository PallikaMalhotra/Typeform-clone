"use client";

import { useState } from "react";
import { COMMIT_DELAY_MS } from "./ChoiceAnswer";
import type { AnswerInputProps } from "./types";
import { useShortcutKeys } from "./useShortcutKeys";
import styles from "../runner.module.css";

const STAR = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z";

export function RatingAnswer({ question, value, onChange, onCommit, interactive }: AnswerInputProps) {
  const steps = question.properties.steps;
  const current = typeof value === "number" ? value : 0;
  const [hover, setHover] = useState(0);

  const pick = (n: number) => {
    if (!interactive) return;
    onChange(n);
    setTimeout(onCommit, COMMIT_DELAY_MS);
  };

  useShortcutKeys(interactive, (key) => {
    // "1".."9", and "0" for 10 on a 10-step scale.
    const n = key === "0" ? 10 : Number(key);
    if (!Number.isInteger(n) || n < 1 || n > steps) return false;
    pick(n);
    return true;
  });

  const values = Array.from({ length: steps }, (_, i) => i + 1);

  if (question.properties.shape === "number") {
    return (
      <div className={styles.scale} role="radiogroup">
        {values.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={current === n}
            tabIndex={interactive ? 0 : -1}
            className={`${styles.choice} ${current === n ? styles.selected : ""}`}
            onClick={() => pick(n)}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  const shown = hover || current;
  return (
    <div className={styles.rating} role="radiogroup" onMouseLeave={() => setHover(0)}>
      {values.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={current === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          tabIndex={interactive ? 0 : -1}
          className={styles.star}
          onClick={() => pick(n)}
          onMouseEnter={() => interactive && setHover(n)}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              d={STAR}
              fill={n <= shown ? "currentColor" : "transparent"}
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinejoin="round"
              opacity={n <= shown ? 1 : 0.6}
            />
          </svg>
          <span>{n}</span>
        </button>
      ))}
    </div>
  );
}

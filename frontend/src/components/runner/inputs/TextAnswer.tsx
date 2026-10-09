"use client";

import { useEffect, useRef } from "react";
import type { AnswerInputProps } from "./types";
import styles from "../runner.module.css";

const PLACEHOLDERS: Record<string, string> = {
  short_text: "Type your answer here...",
  long_text: "Type your answer here...",
  email: "name@example.com",
  number: "Type your answer here...",
};

/** Short text, long text, email and number answers. */
export function TextAnswer({ question, value, onChange, interactive, autoFocus }: AnswerInputProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const text = value === null || value === undefined ? "" : String(value);
  const isLong = question.type === "long_text";

  useEffect(() => {
    // Wait for the slide-in animation before focusing so the page doesn't jump.
    if (!autoFocus) return;
    const id = setTimeout(() => ref.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(id);
  }, [autoFocus]);

  useEffect(() => {
    // Auto-grow the long text area.
    if (!isLong || !ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [text, isLong]);

  const common = {
    ref,
    className: `${styles.textInput} ${isLong ? styles.textArea : ""}`,
    value: text,
    placeholder: PLACEHOLDERS[question.type],
    disabled: !interactive,
    maxLength: question.properties.max_length ?? undefined,
    "aria-label": question.title || "Your answer",
  };

  return (
    <div>
      {isLong ? (
        <textarea {...common} rows={1} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          type={question.type === "email" ? "email" : "text"}
          inputMode={question.type === "number" ? "decimal" : question.type === "email" ? "email" : "text"}
          autoComplete={question.type === "email" ? "email" : "off"}
          onChange={(e) => {
            const next = e.target.value;
            // Number answers: allow only characters that can form a number.
            if (question.type === "number" && !/^-?\d*[.,]?\d*$/.test(next)) return;
            onChange(question.type === "number" ? next.replace(",", ".") : next);
          }}
        />
      )}
      {isLong && interactive && (
        <div className={styles.subHint}>
          <b>Shift ⇧ + Enter ↵</b> to make a line break
        </div>
      )}
    </div>
  );
}

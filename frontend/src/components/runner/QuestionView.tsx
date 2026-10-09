"use client";

import type { ComponentType } from "react";
import { Icon } from "@/components/ui/Icon";
import { AutoTextarea } from "./AutoTextarea";
import type { AnswerValue, Question, QuestionType } from "@/lib/types";
import { ChoiceAnswer } from "./inputs/ChoiceAnswer";
import { DropdownAnswer } from "./inputs/DropdownAnswer";
import { RatingAnswer } from "./inputs/RatingAnswer";
import { TextAnswer } from "./inputs/TextAnswer";
import type { AnswerInputProps, ChoiceEditing } from "./inputs/types";
import { YesNoAnswer } from "./inputs/YesNoAnswer";
import styles from "./runner.module.css";

const INPUTS: Record<QuestionType, ComponentType<AnswerInputProps>> = {
  short_text: TextAnswer,
  long_text: TextAnswer,
  email: TextAnswer,
  number: TextAnswer,
  multiple_choice: ChoiceAnswer,
  dropdown: DropdownAnswer,
  yes_no: YesNoAnswer,
  rating: RatingAnswer,
};

export interface QuestionEditing extends ChoiceEditing {
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

interface QuestionViewProps {
  question: Question;
  number: number;
  value: AnswerValue | undefined;
  error?: string | null;
  /** Bumped on each failed validation to replay the shake animation. */
  errorKey?: number;
  isLast?: boolean;
  submitting?: boolean;
  onChange?: (value: AnswerValue) => void;
  onNext?: () => void;
  onCommit?: () => void;
  /** Builder canvas mode: title, description and choices are edited inline. */
  editing?: QuestionEditing;
}

export function QuestionView({
  question,
  number,
  value,
  error,
  errorKey = 0,
  isLast = false,
  submitting = false,
  onChange = () => {},
  onNext = () => {},
  onCommit = () => {},
  editing,
}: QuestionViewProps) {
  const Input = INPUTS[question.type];
  const interactive = !editing;

  return (
    <div className={styles.question}>
      <div className={styles.number} aria-hidden>
        {number}
        <Icon name="arrowRight" size={14} strokeWidth={2.2} />
      </div>

      {editing ? (
        <>
          <AutoTextarea
            className={`${styles.title} ${styles.editable}`}
            value={question.title}
            placeholder="Your question here. Recall information with @"
            onChange={editing.onTitleChange}
          />
          <AutoTextarea
            className={`${styles.description} ${styles.editable}`}
            value={question.description ?? ""}
            placeholder="Description (optional)"
            onChange={editing.onDescriptionChange}
          />
        </>
      ) : (
        <>
          <h1 className={styles.title}>
            {question.title || "..."}
            {question.required && <span className={styles.required}>*</span>}
          </h1>
          {question.description && <p className={styles.description}>{question.description}</p>}
        </>
      )}

      <div className={styles.answerArea}>
        <Input
          question={question}
          value={value}
          onChange={onChange}
          onCommit={onCommit}
          interactive={interactive}
          autoFocus={interactive}
          editing={editing}
        />
      </div>

      {error ? (
        <div key={errorKey} className={`${styles.error} ${styles.shake}`} role="alert">
          <Icon name="alert" size={16} />
          {error}
        </div>
      ) : (
        <div className={styles.actions}>
          <button className={styles.okBtn} onClick={onNext} disabled={submitting} tabIndex={interactive ? 0 : -1}>
            {isLast ? (submitting ? "Submitting..." : "Submit") : "OK"}
            {!isLast && <Icon name="check" size={20} strokeWidth={2.6} />}
          </button>
          <span className={styles.enterHint}>
            press <b>Enter ↵</b>
          </span>
        </div>
      )}
    </div>
  );
}

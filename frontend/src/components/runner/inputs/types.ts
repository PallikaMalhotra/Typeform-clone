import type { AnswerValue, Question } from "@/lib/types";

export interface ChoiceEditing {
  onLabelChange: (choiceId: string, label: string) => void;
  onAdd: () => void;
  onRemove: (choiceId: string) => void;
}

export interface AnswerInputProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Called when a single-click answer (choice, yes/no, rating) should advance the form. */
  onCommit: () => void;
  /** False in the builder canvas, where the answer area is a static preview. */
  interactive: boolean;
  autoFocus: boolean;
  /** Present in the builder canvas: choice labels become editable inline. */
  editing?: ChoiceEditing;
}

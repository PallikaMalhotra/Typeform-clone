"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { AutoTextarea } from "@/components/runner/AutoTextarea";
import { QuestionView, type QuestionEditing } from "@/components/runner/QuestionView";
import runner from "@/components/runner/runner.module.css";
import { newId } from "@/lib/id";
import { themeVars } from "@/lib/theme";
import type { FormDefinition, Question, ThankYouScreen, WelcomeScreen } from "@/lib/types";
import type { Selection } from "./selection";
import styles from "./builder.module.css";

interface CanvasProps {
  definition: FormDefinition;
  selection: Selection;
  onQuestionChange: (id: string, change: (q: Question) => Question) => void;
  onWelcomeChange: (patch: Partial<WelcomeScreen>) => void;
  onThankYouChange: (patch: Partial<ThankYouScreen>) => void;
  onAdd: () => void;
  onPreview: () => void;
}

/** Live, editable preview of the selected item, rendered with the form's theme. */
export function Canvas({
  definition,
  selection,
  onQuestionChange,
  onWelcomeChange,
  onThankYouChange,
  onAdd,
  onPreview,
}: CanvasProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const { settings, questions } = definition;
  const index = selection.kind === "question" ? questions.findIndex((q) => q.id === selection.id) : -1;
  const question = index >= 0 ? questions[index] : null;

  const editing: QuestionEditing | undefined = question
    ? {
        onTitleChange: (title) => onQuestionChange(question.id, (q) => ({ ...q, title })),
        onDescriptionChange: (description) =>
          onQuestionChange(question.id, (q) => ({ ...q, description: description || null })),
        onLabelChange: (choiceId, label) =>
          onQuestionChange(question.id, (q) => ({
            ...q,
            choices: q.choices.map((c) => (c.id === choiceId ? { ...c, label } : c)),
          })),
        onAdd: () =>
          onQuestionChange(question.id, (q) => ({
            ...q,
            choices: [...q.choices, { id: newId(), label: `Choice ${q.choices.length + 1}` }],
          })),
        onRemove: (choiceId) =>
          onQuestionChange(question.id, (q) => ({
            ...q,
            choices: q.choices.filter((c) => c.id !== choiceId),
            logic: q.logic.filter((rule) => rule.value !== choiceId),
          })),
      }
    : undefined;

  return (
    <section className={styles.canvasArea} aria-label="Live preview">
      <div className={styles.canvasToolbar}>
        <div className={styles.segmented} role="group" aria-label="Device">
          <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
            <Icon name="monitor" size={15} /> Desktop
          </button>
          <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
            <Icon name="phone" size={15} /> Mobile
          </button>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={onPreview}>
          <Icon name="play" size={14} /> Preview
        </button>
      </div>

      <div className={styles.canvasWrap}>
        <div className={`${styles.canvas} ${device === "mobile" ? styles.mobile : ""}`}>
          <div className={runner.root} style={themeVars(settings.theme)}>
            <div className={styles.canvasContent}>
              {question && editing && (
                <QuestionView
                  key={question.id}
                  question={question}
                  number={index + 1}
                  value={undefined}
                  editing={editing}
                />
              )}

              {selection.kind === "question" && !question && (
                <div className={styles.canvasEmpty} style={{ color: "inherit" }}>
                  <p style={{ margin: 0 }}>Add your first question to get started.</p>
                  <button className="btn btn-primary" onClick={onAdd}>
                    <Icon name="plus" /> Add content
                  </button>
                </div>
              )}

              {selection.kind === "welcome" && (
                <div className={runner.screen} style={{ opacity: settings.welcome.enabled ? 1 : 0.5 }}>
                  <AutoTextarea
                    className={`${runner.screenTitle} ${runner.editable}`}
                    value={settings.welcome.title}
                    placeholder="Welcome title"
                    onChange={(title) => onWelcomeChange({ title })}
                  />
                  <AutoTextarea
                    className={`${runner.screenDescription} ${runner.editable}`}
                    value={settings.welcome.description}
                    placeholder="Description (optional)"
                    onChange={(description) => onWelcomeChange({ description })}
                  />
                  <span className={runner.okBtn}>{settings.welcome.button_text || "Start"}</span>
                </div>
              )}

              {selection.kind === "ending" && (
                <div className={runner.screen}>
                  <AutoTextarea
                    className={`${runner.screenTitle} ${runner.editable}`}
                    value={settings.thank_you.title}
                    placeholder="Thank you title"
                    onChange={(title) => onThankYouChange({ title })}
                  />
                  <AutoTextarea
                    className={`${runner.screenDescription} ${runner.editable}`}
                    value={settings.thank_you.description}
                    placeholder="Description (optional)"
                    onChange={(description) => onThankYouChange({ description })}
                  />
                  {settings.thank_you.button_text && (
                    <span className={runner.okBtn}>{settings.thank_you.button_text}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

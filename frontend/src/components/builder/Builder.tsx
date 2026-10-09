"use client";

import { useCallback, useState } from "react";
import { useFormEditor } from "@/components/editor/FormEditorContext";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { newId } from "@/lib/id";
import { deleteQuestion, duplicateQuestion, insertQuestion, moveQuestion, updateQuestion } from "@/lib/formEditing";
import { createQuestion } from "@/lib/questionTypes";
import type { Question, QuestionType, ThankYouScreen, Theme, WelcomeScreen } from "@/lib/types";
import { AddQuestionDialog } from "./AddQuestionDialog";
import { Canvas } from "./Canvas";
import { DesignSettings } from "./DesignSettings";
import { LogicSettings } from "./LogicSettings";
import { PreviewModal } from "./PreviewModal";
import { QuestionList } from "./QuestionList";
import { QuestionSettings } from "./QuestionSettings";
import { ThankYouSettings, WelcomeSettings } from "./ScreenSettings";
import type { Selection } from "./selection";
import styles from "./builder.module.css";

type PanelTab = "content" | "design" | "logic";

/** The "Create" tab: question list, live canvas and settings panel. */
export function Builder() {
  const { form, update } = useFormEditor();
  const toast = useToast();
  const [selection, setSelection] = useState<Selection>(() =>
    form.questions[0] ? { kind: "question", id: form.questions[0].id } : { kind: "question", id: "" },
  );
  const [tab, setTab] = useState<PanelTab>("content");
  const [adding, setAdding] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null);

  const selectedQuestion =
    selection.kind === "question" ? form.questions.find((q) => q.id === selection.id) : undefined;

  const changeQuestion = useCallback(
    (id: string, change: (q: Question) => Question) => update((def) => updateQuestion(def, id, change)),
    [update],
  );
  const changeWelcome = (patch: Partial<WelcomeScreen>) =>
    update((def) => ({ ...def, settings: { ...def.settings, welcome: { ...def.settings.welcome, ...patch } } }));
  const changeThankYou = (patch: Partial<ThankYouScreen>) =>
    update((def) => ({ ...def, settings: { ...def.settings, thank_you: { ...def.settings.thank_you, ...patch } } }));
  const changeTheme = (theme: Theme) => update((def) => ({ ...def, settings: { ...def.settings, theme } }));

  const addQuestion = (type: QuestionType) => {
    const question = createQuestion(type);
    update((def) => insertQuestion(def, question, selectedQuestion?.id ?? null));
    setSelection({ kind: "question", id: question.id });
    setTab("content");
  };

  const duplicate = (id: string) => {
    const copyId = newId();
    update((def) => duplicateQuestion(def, id, copyId));
    setSelection({ kind: "question", id: copyId });
    toast.success("Question duplicated");
  };

  const remove = (question: Question) => {
    const index = form.questions.findIndex((q) => q.id === question.id);
    const neighbour = form.questions[index + 1] ?? form.questions[index - 1];
    update((def) => deleteQuestion(def, question.id));
    setSelection({ kind: "question", id: neighbour?.id ?? "" });
    toast.success("Question deleted");
  };

  const requestDelete = (id: string) => {
    const question = form.questions.find((q) => q.id === id);
    if (!question) return;
    // Deleting a question of a form with responses also deletes its answers.
    if (form.response_count > 0) setPendingDelete(question);
    else remove(question);
  };

  return (
    <div className={styles.layout}>
      <QuestionList
        questions={form.questions}
        selection={selection}
        welcomeEnabled={form.settings.welcome.enabled}
        onSelect={setSelection}
        onMove={(from, to) => update((def) => moveQuestion(def, from, to))}
        onDuplicate={duplicate}
        onDelete={requestDelete}
        onAdd={() => setAdding(true)}
      />

      <Canvas
        definition={form}
        selection={selection}
        onQuestionChange={changeQuestion}
        onWelcomeChange={changeWelcome}
        onThankYouChange={changeThankYou}
        onAdd={() => setAdding(true)}
        onPreview={() => setPreviewing(true)}
      />

      <aside className={styles.panel}>
        <div className={styles.panelTabs} role="tablist">
          <button
            role="tab"
            className={styles.panelTab}
            aria-selected={tab === "content"}
            onClick={() => setTab("content")}
          >
            <Icon name="settings" size={15} /> Content
          </button>
          <button
            role="tab"
            className={styles.panelTab}
            aria-selected={tab === "design"}
            onClick={() => setTab("design")}
          >
            <Icon name="palette" size={15} /> Design
          </button>
          <button
            role="tab"
            className={styles.panelTab}
            aria-selected={tab === "logic"}
            onClick={() => setTab("logic")}
          >
            <Icon name="branch" size={15} /> Logic
          </button>
        </div>
        <div className={styles.panelBody} role="tabpanel">
          {tab === "design" && <DesignSettings theme={form.settings.theme} onChange={changeTheme} />}

          {tab === "content" && selectedQuestion && (
            <QuestionSettings
              key={selectedQuestion.id}
              question={selectedQuestion}
              onChange={(change) => changeQuestion(selectedQuestion.id, change)}
            />
          )}
          {tab === "content" && selection.kind === "welcome" && (
            <WelcomeSettings screen={form.settings.welcome} onChange={changeWelcome} />
          )}
          {tab === "content" && selection.kind === "ending" && (
            <ThankYouSettings screen={form.settings.thank_you} onChange={changeThankYou} />
          )}

          {tab === "logic" && selectedQuestion && (
            <LogicSettings
              question={selectedQuestion}
              questions={form.questions}
              onChange={(change) => changeQuestion(selectedQuestion.id, change)}
            />
          )}
          {tab === "logic" && !selectedQuestion && (
            <p className={styles.muted}>Select a question to add logic jumps.</p>
          )}
          {tab === "content" && selection.kind === "question" && !selectedQuestion && (
            <p className={styles.muted}>Add a question or select one from the list to edit its settings.</p>
          )}
        </div>
      </aside>

      <AddQuestionDialog open={adding} onClose={() => setAdding(false)} onPick={addQuestion} />
      {previewing && <PreviewModal definition={form} onClose={() => setPreviewing(false)} />}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this question?"
        danger
        confirmLabel="Delete question"
        message="This form already has responses. Deleting the question also deletes the answers given to it. This can't be undone."
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

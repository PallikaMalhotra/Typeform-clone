"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { TypeBadge } from "@/components/ui/TypeBadge";
import type { LogicRule, Question } from "@/lib/types";
import { useFormEditor } from "./FormEditorContext";
import styles from "./editor.module.css";

const OPERATOR_LABELS: Record<LogicRule["operator"], string> = {
  is: "is",
  is_not: "is not",
  greater_than: "is greater than",
  lower_than: "is lower than",
};

function describeValue(question: Question, value: string): string {
  if (question.type === "yes_no") return value === "true" ? "Yes" : "No";
  return question.choices.find((c) => c.id === value)?.label ?? value;
}

/** An overview of all logic jumps in the form. Rules are edited in the builder's Logic panel. */
export function WorkflowView() {
  const { form } = useFormEditor();
  const withLogic = form.questions.filter((q) => q.logic.length > 0);
  const numberOf = (id: string | null) => (id ? form.questions.findIndex((q) => q.id === id) + 1 : 0);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Workflow</h1>
      <p className={styles.pageLead}>Logic jumps send respondents down different paths depending on their answers.</p>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Logic map</h2>
        {withLogic.length === 0 && (
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            No logic yet. Select a question in{" "}
            <Link href={`/forms/${form.id}/create`} style={{ textDecoration: "underline" }}>
              Create
            </Link>{" "}
            and open the <strong>Logic</strong> panel to add a jump.
          </p>
        )}
        {withLogic.map((question) => (
          <div key={question.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, marginBottom: 4 }}>
              <TypeBadge type={question.type} number={numberOf(question.id)} size="sm" />
              {question.title || "Untitled question"}
            </div>
            {question.logic.map((rule, i) => {
              const destination = form.questions.find((q) => q.id === rule.destination_id);
              return (
                <div key={i} className={styles.rule}>
                  If answer {OPERATOR_LABELS[rule.operator]}{" "}
                  <span className={styles.pill}>{describeValue(question, rule.value)}</span>
                  <Icon name="arrowRight" size={14} />
                  <span className={styles.pill}>
                    {destination
                      ? `${numberOf(destination.id)}. ${destination.title || "Untitled question"}`
                      : "Thank you screen"}
                  </span>
                </div>
              );
            })}
            <div className={styles.rule} style={{ color: "var(--text-3)" }}>
              All other cases <Icon name="arrowRight" size={14} /> next question
            </div>
          </div>
        ))}
      </section>

      <div className={styles.cards}>
        {[
          { title: "Calculations & scoring", text: "Score answers to build quizzes and calculators." },
          { title: "Hidden fields & variables", text: "Pass data in the URL and use it in your form." },
          { title: "Response notifications", text: "Email yourself or the respondent after each submission." },
        ].map((card) => (
          <div key={card.title} className={styles.card}>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <span className="badge badge-soon">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { formatDateTime } from "@/lib/format";
import type { FormResponse, Question } from "@/lib/types";
import styles from "./results.module.css";

interface ResponseDrawerProps {
  response: FormResponse | null;
  questions: Question[];
  onClose: () => void;
  onDelete: (response: FormResponse) => void;
}

/** Slide-over showing one response in full, question by question. */
export function ResponseDrawer({ response, questions, onClose, onDelete }: ResponseDrawerProps) {
  useEffect(() => {
    if (!response) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [response, onClose]);

  const answers = new Map(response?.answers.map((a) => [a.question_id, a]));

  return (
    <AnimatePresence>
      {response && (
        <>
          <motion.div
            className={styles.drawerBackdrop}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Response details"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className={styles.drawerHead}>
              <div>
                <strong>{response.completed ? "Completed response" : "Partial response"}</strong>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {response.submitted_at
                    ? `Submitted ${formatDateTime(response.submitted_at)}`
                    : `Started ${formatDateTime(response.started_at)}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className="icon-btn"
                  onClick={() => onDelete(response)}
                  aria-label="Delete response"
                  title="Delete response"
                >
                  <Icon name="trash" />
                </button>
                <button className="icon-btn" onClick={onClose} aria-label="Close">
                  <Icon name="close" />
                </button>
              </div>
            </div>
            <div className={styles.drawerBody}>
              {questions.map((question, index) => {
                const answer = answers.get(question.id);
                return (
                  <div key={question.id} className={styles.answer}>
                    <div className={styles.answerQuestion}>
                      <TypeBadge type={question.type} number={index + 1} size="sm" />
                      {question.title || "Untitled question"}
                    </div>
                    <div className={`${styles.answerValue} ${answer ? "" : styles.missing}`}>
                      {answer ? answer.display : "No answer"}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

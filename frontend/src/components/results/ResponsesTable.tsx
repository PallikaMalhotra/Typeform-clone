"use client";

import { formatDateTime } from "@/lib/format";
import type { FormResponse, Question } from "@/lib/types";
import styles from "./results.module.css";

interface ResponsesTableProps {
  responses: FormResponse[];
  questions: Question[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (response: FormResponse) => void;
}

export function ResponsesTable({ responses, questions, selected, onToggle, onToggleAll, onOpen }: ResponsesTableProps) {
  const allSelected = responses.length > 0 && responses.every((r) => selected.has(r.id));
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkCell}>
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all responses" />
            </th>
            <th>Date</th>
            {questions.map((q, i) => (
              <th key={q.id} title={q.title}>
                {i + 1}. {q.title || "Untitled"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {responses.map((response) => {
            const answers = new Map(response.answers.map((a) => [a.question_id, a.display]));
            return (
              <tr key={response.id} onClick={() => onOpen(response)}>
                <td className={styles.checkCell} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(response.id)}
                    onChange={() => onToggle(response.id)}
                    aria-label="Select response"
                  />
                </td>
                <td>{formatDateTime(response.submitted_at ?? response.started_at)}</td>
                {questions.map((q) => (
                  <td key={q.id} title={answers.get(q.id)}>
                    {answers.get(q.id) ?? <span style={{ color: "var(--text-3)" }}>–</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

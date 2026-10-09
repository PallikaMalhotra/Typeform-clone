"use client";

import { TypeBadge } from "@/components/ui/TypeBadge";
import { TYPE_META } from "@/lib/questionTypes";
import type { FormSummaryStats, QuestionSummary } from "@/lib/types";
import styles from "./results.module.css";

function Bars({ summary }: { summary: QuestionSummary }) {
  const color = TYPE_META[summary.type].color;
  return (
    <div className={styles.bars}>
      {summary.choices!.map((choice, i) => (
        <div key={i} className={styles.bar}>
          <span className={styles.barLabel} title={choice.label}>
            {choice.label}
          </span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${choice.percentage}%`, background: color }} />
          </div>
          <span className={styles.barValue}>
            <b>{choice.percentage}%</b> · {choice.count}
          </span>
        </div>
      ))}
    </div>
  );
}

const formatNumber = (n: number | null) => (n === null ? "–" : Number.isInteger(n) ? String(n) : n.toFixed(2));

function QuestionCard({ summary, index, total }: { summary: QuestionSummary; index: number; total: number }) {
  const isNumeric = summary.type === "number" || summary.type === "rating";
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <TypeBadge type={summary.type} number={index + 1} size="sm" />
        <h3 className={styles.cardTitle}>{summary.title || "Untitled question"}</h3>
      </div>
      <p className={styles.cardMeta}>
        {summary.answered} out of {total} people answered this question
      </p>

      {summary.answered === 0 ? (
        <p className={styles.cardMeta}>No answers yet.</p>
      ) : (
        <>
          {isNumeric && (
            <div className={styles.stats}>
              <div className={styles.stat}>
                <b>{formatNumber(summary.average)}</b>
                <span>Average</span>
              </div>
              <div className={styles.stat}>
                <b>{formatNumber(summary.minimum)}</b>
                <span>Lowest</span>
              </div>
              <div className={styles.stat}>
                <b>{formatNumber(summary.maximum)}</b>
                <span>Highest</span>
              </div>
            </div>
          )}
          {summary.choices && <Bars summary={summary} />}
          {summary.latest && (
            <ul className={styles.latest}>
              {summary.latest.map((text, i) => (
                <li key={i}>{text || "–"}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}

export function SummaryView({ stats }: { stats: FormSummaryStats }) {
  if (stats.questions.length === 0) return <div className={styles.empty}>This form has no questions yet.</div>;
  return (
    <div>
      {stats.questions.map((summary, index) => (
        <QuestionCard key={summary.question_id} summary={summary} index={index} total={stats.insights.submissions} />
      ))}
    </div>
  );
}

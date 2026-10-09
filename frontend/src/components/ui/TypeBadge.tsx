// The coloured question-type tile used across the builder (icon + optional number).

import { TYPE_META } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";

const glyphs: Record<QuestionType, string> = {
  short_text: "M5 12h14",
  long_text: "M5 8h14M5 12h14M5 16h9",
  multiple_choice: "M5 7l2 2 3-3M13 8h6M5 15l2 2 3-3M13 16h6",
  dropdown: "M7 10l5 5 5-5",
  yes_no: "M12 4a8 8 0 100 16V4z",
  email: "M16 12a4 4 0 10-1.2 2.9M16 8v5a2.5 2.5 0 005 0v-1a9 9 0 10-3.5 7.1",
  number: "M9 4L7 20M17 4l-2 16M4 9h16M3 15h16",
  rating: "M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4.1-4 5.7-.8z",
};

interface TypeBadgeProps {
  type: QuestionType;
  number?: number;
  size?: "sm" | "md";
}

export function TypeBadge({ type, number, size = "md" }: TypeBadgeProps) {
  const meta = TYPE_META[type];
  const height = size === "sm" ? 22 : 26;
  return (
    <span
      title={meta.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height,
        minWidth: height,
        padding: number === undefined ? 0 : "0 7px 0 5px",
        justifyContent: "center",
        borderRadius: 6,
        background: meta.color,
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={glyphs[type]} fill={type === "yes_no" || type === "rating" ? "currentColor" : "none"} />
      </svg>
      {number !== undefined && <span>{number}</span>}
    </span>
  );
}

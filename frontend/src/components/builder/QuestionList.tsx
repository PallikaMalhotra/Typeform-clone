"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/ui/Icon";
import { TypeBadge } from "@/components/ui/TypeBadge";
import type { Question } from "@/lib/types";
import type { Selection } from "./selection";
import styles from "./builder.module.css";

interface QuestionListProps {
  questions: Question[];
  selection: Selection;
  welcomeEnabled: boolean;
  onSelect: (selection: Selection) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

function SortableQuestion({
  question,
  number,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  question: Question;
  number: number;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[styles.item, selected && styles.selected, isDragging && styles.dragging].filter(Boolean).join(" ")}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-current={selected}
      onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && onSelect()}
    >
      <span
        ref={setActivatorNodeRef}
        className={styles.handle}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <Icon name="drag" size={16} strokeWidth={3} />
      </span>
      <TypeBadge type={question.type} number={number} size="sm" />
      <span className={`${styles.itemTitle} ${question.title ? "" : styles.placeholder}`}>
        {question.title || "..."}
      </span>
      <span className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" onClick={onDuplicate} aria-label="Duplicate question" title="Duplicate">
          <Icon name="copy" size={15} />
        </button>
        <button className="icon-btn" onClick={onDelete} aria-label="Delete question" title="Delete">
          <Icon name="trash" size={15} />
        </button>
      </span>
    </div>
  );
}

export function QuestionList({
  questions,
  selection,
  welcomeEnabled,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onAdd,
}: QuestionListProps) {
  const sensors = useSensors(
    // A small distance lets plain clicks select instead of starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = questions.findIndex((q) => q.id === active.id);
    const to = questions.findIndex((q) => q.id === over.id);
    if (from !== -1 && to !== -1) onMove(from, to);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        Content
        <button className="btn btn-sm btn-primary" onClick={onAdd}>
          <Icon name="plus" size={16} /> Add content
        </button>
      </div>
      <div className={styles.list}>
        <div
          className={`${styles.item} ${selection.kind === "welcome" ? styles.selected : ""}`}
          onClick={() => onSelect({ kind: "welcome" })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onSelect({ kind: "welcome" })}
        >
          <span className={styles.screenIcon}>
            <Icon name="home" size={14} />
          </span>
          <span className={`${styles.itemTitle} ${welcomeEnabled ? "" : styles.placeholder}`}>
            Welcome screen{welcomeEnabled ? "" : " (off)"}
          </span>
        </div>

        <div className={styles.sectionLabel}>Questions</div>
        {questions.length === 0 && (
          <div className={styles.emptyList}>No questions yet. Click “Add content” to start.</div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            {questions.map((question, index) => (
              <SortableQuestion
                key={question.id}
                question={question}
                number={index + 1}
                selected={selection.kind === "question" && selection.id === question.id}
                onSelect={() => onSelect({ kind: "question", id: question.id })}
                onDuplicate={() => onDuplicate(question.id)}
                onDelete={() => onDelete(question.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div className={styles.sectionLabel}>Endings</div>
        <div
          className={`${styles.item} ${selection.kind === "ending" ? styles.selected : ""}`}
          onClick={() => onSelect({ kind: "ending" })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onSelect({ kind: "ending" })}
        >
          <span className={styles.screenIcon}>
            <Icon name="flag" size={14} />
          </span>
          <span className={styles.itemTitle}>Thank you screen</span>
        </div>
      </div>
    </aside>
  );
}

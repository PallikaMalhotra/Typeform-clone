"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { COMMIT_DELAY_MS } from "./ChoiceAnswer";
import type { AnswerInputProps } from "./types";
import styles from "../runner.module.css";

/** Type-to-filter dropdown, like Typeform's: the list opens under the input. */
export function DropdownAnswer({
  question,
  value,
  onChange,
  onCommit,
  interactive,
  autoFocus,
  editing,
}: AnswerInputProps) {
  const selectedId = Array.isArray(value) ? value[0] : typeof value === "string" ? value : undefined;
  const selected = question.choices.find((c) => c.id === selectedId);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    // When the input shows the current selection, list everything.
    const q = query.trim().toLowerCase();
    if (!q || q === selected?.label.toLowerCase()) return question.choices;
    return question.choices.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, question.choices, selected]);

  useEffect(() => {
    if (!autoFocus) return;
    const id = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(id);
  }, [autoFocus]);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (id: string) => {
    const choice = question.choices.find((c) => c.id === id);
    setQuery(choice?.label ?? "");
    setOpen(false);
    onChange(id);
    setTimeout(onCommit, COMMIT_DELAY_MS);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // Keep arrows for the list instead of form navigation.
      e.preventDefault();
      setOpen(true);
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => Math.max(0, Math.min(filtered.length - 1, a + delta)));
    } else if (e.key === "Enter" && open && filtered[active]) {
      e.preventDefault();
      choose(filtered[active].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (editing) {
    // Builder canvas: show the options as an editable list.
    return (
      <div className={styles.choices}>
        {question.choices.map((choice, index) => (
          <div key={choice.id} className={styles.choice} style={{ width: "100%" }}>
            <input
              className={styles.choiceEdit}
              value={choice.label}
              placeholder={`Choice ${index + 1}`}
              onChange={(e) => editing.onLabelChange(choice.id, e.target.value)}
              aria-label={`Choice ${index + 1}`}
            />
            {question.choices.length > 1 && (
              <button
                className={styles.choiceRemove}
                onClick={() => editing.onRemove(choice.id)}
                aria-label="Remove choice"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        ))}
        <button className={styles.addChoice} onClick={editing.onAdd}>
          Add choice
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.dropdown}>
        <input
          ref={inputRef}
          className={styles.textInput}
          placeholder="Type or select an option"
          value={query}
          disabled={!interactive}
          role="combobox"
          aria-expanded={open}
          aria-label={question.title || "Select an option"}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          className={styles.dropdownToggle}
          onClick={() => setOpen((o) => !o)}
          tabIndex={-1}
          aria-label="Toggle options"
          disabled={!interactive}
        >
          <Icon name={open ? "chevronUp" : "chevronDown"} size={26} />
        </button>
      </div>
      {open && interactive && (
        <div className={styles.options} ref={listRef} role="listbox">
          {filtered.length === 0 && <div className={styles.empty}>No suggestions found</div>}
          {filtered.map((choice, index) => (
            <button
              key={choice.id}
              type="button"
              role="option"
              aria-selected={choice.id === selectedId}
              className={[
                styles.choice,
                styles.option,
                index === active && styles.active,
                choice.id === selectedId && styles.selected,
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(choice.id)}
            >
              <span className={styles.choiceLabel}>{choice.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

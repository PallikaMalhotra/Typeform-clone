"use client";

import { Modal } from "@/components/ui/Modal";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { COMING_SOON_TYPES, QUESTION_TYPES } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";
import styles from "./builder.module.css";

interface AddQuestionDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (type: QuestionType) => void;
}

const GROUPS = ["Text", "Choice", "Contact info", "Rating & ranking", "Other"] as const;

export function AddQuestionDialog({ open, onClose, onPick }: AddQuestionDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add form elements" width={640}>
      <div className={styles.typeGroups}>
        {GROUPS.map((group) => (
          <div key={group} className={styles.typeGroup}>
            <h4>{group}</h4>
            {QUESTION_TYPES.filter((t) => t.group === group).map((meta) => (
              <button
                key={meta.type}
                className={styles.typeOption}
                onClick={() => {
                  onPick(meta.type);
                  onClose();
                }}
              >
                <TypeBadge type={meta.type} />
                <span>
                  {meta.label}
                  <small>{meta.description}</small>
                </span>
              </button>
            ))}
          </div>
        ))}
        <div className={styles.typeGroup}>
          <h4>Coming soon</h4>
          {COMING_SOON_TYPES.map((item) => (
            <button key={item.label} className={styles.typeOption} disabled title="Coming soon">
              <span className={styles.soonDot} style={{ background: item.color }} />
              <span>
                {item.label}
                <small>Coming soon</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

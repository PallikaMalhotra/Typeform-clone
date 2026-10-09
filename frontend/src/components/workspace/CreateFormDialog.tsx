"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Modal, PromptDialog } from "@/components/ui/Modal";
import styles from "./workspace.module.css";

interface CreateFormDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}

const OPTIONS: { icon: IconName; title: string; text: string; soon?: boolean }[] = [
  { icon: "plus", title: "Start from scratch", text: "Build a form from a blank canvas" },
  { icon: "grid", title: "Use a template", text: "Pick from ready-made forms", soon: true },
  { icon: "star", title: "Create with AI", text: "Describe it and we draft it", soon: true },
];

/** Typeform-style "Create a new form" chooser, followed by a name prompt. */
export function CreateFormDialog({ open, onClose, onCreate }: CreateFormDialogProps) {
  const [naming, setNaming] = useState(false);

  return (
    <>
      <Modal open={open && !naming} onClose={onClose} title="Create a new form" width={680}>
        <div className={styles.createOptions}>
          {OPTIONS.map((option) => (
            <button
              key={option.title}
              className={styles.createOption}
              disabled={option.soon}
              onClick={() => setNaming(true)}
            >
              <span className={styles.createIcon}>
                <Icon name={option.icon} />
              </span>
              <strong>{option.title}</strong>
              <span>{option.text}</span>
              {option.soon && <span className="badge badge-soon">Coming soon</span>}
            </button>
          ))}
        </div>
      </Modal>
      <PromptDialog
        open={open && naming}
        title="Name your form"
        label="Form name"
        initialValue="My new form"
        confirmLabel="Continue"
        onSubmit={onCreate}
        onClose={() => {
          setNaming(false);
          onClose();
        }}
      />
    </>
  );
}

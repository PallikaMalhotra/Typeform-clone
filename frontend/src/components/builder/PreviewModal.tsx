"use client";

import { useEffect, useState } from "react";
import { FormRunner } from "@/components/runner/FormRunner";
import { Icon } from "@/components/ui/Icon";
import type { FormDefinition } from "@/lib/types";
import styles from "./builder.module.css";

/** Full-screen preview running the real respondent flow, without saving anything. */
export function PreviewModal({ definition, onClose }: { definition: FormDefinition; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className={styles.previewOverlay} role="dialog" aria-modal="true" aria-label="Form preview">
      <div className={styles.previewBar}>
        <strong>Preview</strong>
        <div className={styles.segmented} role="group" aria-label="Device">
          <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
            <Icon name="monitor" size={15} /> Desktop
          </button>
          <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
            <Icon name="phone" size={15} /> Mobile
          </button>
        </div>
        <button className="btn btn-sm" style={{ background: "#fff", color: "#191919" }} onClick={onClose}>
          <Icon name="close" size={14} /> Close
        </button>
      </div>
      <div className={styles.previewFrame}>
        <div className={`${styles.previewDevice} ${device === "mobile" ? styles.mobile : ""}`}>
          <FormRunner form={definition} mode="preview" />
        </div>
      </div>
    </div>
  );
}

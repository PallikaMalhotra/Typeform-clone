"use client";

import { Toggle } from "@/components/ui/Toggle";
import type { ThankYouScreen, WelcomeScreen } from "@/lib/types";
import styles from "./builder.module.css";

export function WelcomeSettings({
  screen,
  onChange,
}: {
  screen: WelcomeScreen;
  onChange: (patch: Partial<WelcomeScreen>) => void;
}) {
  return (
    <>
      <div className={styles.group}>
        <div className={styles.groupTitle}>Welcome screen</div>
        <div className={styles.row}>
          Show welcome screen
          <Toggle label="Show welcome screen" checked={screen.enabled} onChange={(enabled) => onChange({ enabled })} />
        </div>
        <p className={styles.muted}>
          Greets respondents before the first question. Edit the text directly on the canvas.
        </p>
      </div>
      <label className="field">
        <span className="field-label">Button text</span>
        <input
          className="input"
          maxLength={40}
          value={screen.button_text}
          onChange={(e) => onChange({ button_text: e.target.value })}
        />
      </label>
    </>
  );
}

export function ThankYouSettings({
  screen,
  onChange,
}: {
  screen: ThankYouScreen;
  onChange: (patch: Partial<ThankYouScreen>) => void;
}) {
  return (
    <>
      <div className={styles.group}>
        <div className={styles.groupTitle}>Thank you screen</div>
        <p className={styles.muted}>Shown after a response is submitted. Edit the text directly on the canvas.</p>
      </div>
      <label className="field">
        <span className="field-label">Button text (optional)</span>
        <input
          className="input"
          maxLength={40}
          placeholder="e.g. Visit our website"
          value={screen.button_text}
          onChange={(e) => onChange({ button_text: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">Button link</span>
        <input
          className="input"
          type="url"
          placeholder="https://"
          value={screen.button_url}
          onChange={(e) => onChange({ button_url: e.target.value })}
        />
      </label>
      <div className={styles.group}>
        <div className={styles.groupTitle}>More endings</div>
        <p className={styles.muted}>
          Multiple endings and redirects <span className="badge badge-soon">Coming soon</span>
        </p>
      </div>
    </>
  );
}

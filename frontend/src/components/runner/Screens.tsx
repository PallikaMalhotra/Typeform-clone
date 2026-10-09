"use client";

import type { ThankYouScreen, WelcomeScreen } from "@/lib/types";
import styles from "./runner.module.css";

export function Welcome({ screen, onStart }: { screen: WelcomeScreen; onStart: () => void }) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.screenTitle}>{screen.title}</h1>
      {screen.description && <p className={styles.screenDescription}>{screen.description}</p>}
      <div className={styles.actions}>
        <button className={styles.okBtn} onClick={onStart}>
          {screen.button_text || "Start"}
        </button>
        <span className={styles.enterHint}>
          press <b>Enter ↵</b>
        </span>
      </div>
    </div>
  );
}

export function ThankYou({ screen }: { screen: ThankYouScreen }) {
  // Only follow http(s) links: the URL is creator-provided content.
  const safeUrl = /^https?:\/\//i.test(screen.button_url) ? screen.button_url : "";
  return (
    <div className={styles.screen}>
      <h1 className={styles.screenTitle}>{screen.title || "Thanks for completing this form"}</h1>
      {screen.description && <p className={styles.screenDescription}>{screen.description}</p>}
      {screen.button_text && (
        <div className={styles.actions}>
          {safeUrl ? (
            <a className={styles.okBtn} href={safeUrl} target="_blank" rel="noopener noreferrer">
              {screen.button_text}
            </a>
          ) : (
            <span className={styles.okBtn}>{screen.button_text}</span>
          )}
        </div>
      )}
    </div>
  );
}

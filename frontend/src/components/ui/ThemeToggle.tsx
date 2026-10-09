"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const STORAGE_KEY = "tf-app-theme";

/** Light/dark mode for the creator app (respondent forms use their own theme). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
  };

  return (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title="Toggle dark mode"
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}

/** Inline script run before paint so the saved theme applies without a flash. */
export const themeInitScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

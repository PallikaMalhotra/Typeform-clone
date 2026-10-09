"use client";

import { useEffect, useRef } from "react";

/**
 * Listen for single-key shortcuts (A/B/C for choices, Y/N, 1-9 for ratings)
 * while the respondent isn't typing in a field.
 */
export function useShortcutKeys(enabled: boolean, handler: (key: string) => boolean) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (handlerRef.current(e.key.toUpperCase())) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

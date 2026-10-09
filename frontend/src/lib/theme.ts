// Form themes: presets, fonts and the CSS variables the respondent UI reads.

import type { CSSProperties } from "react";
import type { Theme } from "./types";

export const FONTS = [
  "Inter",
  "Montserrat",
  "Lora",
  "Playfair Display",
  "Space Grotesk",
  "Karla",
  "Nunito",
  "Roboto Mono",
];

export const THEME_PRESETS: { name: string; theme: Theme }[] = [
  {
    name: "Classic",
    theme: {
      background: "#FFFFFF",
      question: "#191919",
      answer: "#0445AF",
      button: "#0445AF",
      button_text: "#FFFFFF",
      font: "Inter",
    },
  },
  {
    name: "Midnight",
    theme: {
      background: "#0B2A4A",
      question: "#FFFFFF",
      answer: "#8FD3FF",
      button: "#8FD3FF",
      button_text: "#0B2A4A",
      font: "Montserrat",
    },
  },
  {
    name: "Peach",
    theme: {
      background: "#FFF8F0",
      question: "#3D2B1F",
      answer: "#C2410C",
      button: "#C2410C",
      button_text: "#FFFFFF",
      font: "Lora",
    },
  },
  {
    name: "Forest",
    theme: {
      background: "#E8F1EA",
      question: "#1F3B2D",
      answer: "#2F7D4F",
      button: "#2F7D4F",
      button_text: "#FFFFFF",
      font: "Karla",
    },
  },
  {
    name: "Lavender",
    theme: {
      background: "#F2EEFF",
      question: "#2A1F5C",
      answer: "#6C4CE0",
      button: "#6C4CE0",
      button_text: "#FFFFFF",
      font: "Nunito",
    },
  },
  {
    name: "Noir",
    theme: {
      background: "#111111",
      question: "#F5F5F5",
      answer: "#F5C542",
      button: "#F5C542",
      button_text: "#111111",
      font: "Space Grotesk",
    },
  },
];

export function fontStylesheetUrl(font: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}:wght@400;500;700&display=swap`;
}

/** CSS custom properties consumed by the runner's stylesheet. */
export function themeVars(theme: Theme): CSSProperties {
  return {
    "--tf-bg": theme.background,
    "--tf-question": theme.question,
    "--tf-answer": theme.answer,
    "--tf-button": theme.button,
    "--tf-button-text": theme.button_text,
    "--tf-font": `"${theme.font}", "Inter", system-ui, sans-serif`,
  } as CSSProperties;
}

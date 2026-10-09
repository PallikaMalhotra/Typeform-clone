"use client";

import { FONTS, THEME_PRESETS } from "@/lib/theme";
import type { Theme } from "@/lib/types";
import styles from "./builder.module.css";

const COLOR_FIELDS: { key: keyof Theme; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "question", label: "Questions" },
  { key: "answer", label: "Answers" },
  { key: "button", label: "Buttons" },
  { key: "button_text", label: "Button text" },
];

const sameTheme = (a: Theme, b: Theme) =>
  (Object.keys(a) as (keyof Theme)[]).every((k) => a[k].toLowerCase() === b[k].toLowerCase());

export function DesignSettings({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <>
      <div className={styles.group}>
        <div className={styles.groupTitle}>Themes</div>
        <div className={styles.swatches}>
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className={styles.swatch}
              aria-pressed={sameTheme(preset.theme, theme)}
              onClick={() => onChange(preset.theme)}
            >
              <span
                className={styles.swatchPreview}
                style={{
                  background: preset.theme.background,
                  color: preset.theme.question,
                  fontFamily: preset.theme.font,
                }}
              >
                Aa
                <span className={styles.swatchBar} style={{ background: preset.theme.answer }} />
              </span>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Colors</div>
        {COLOR_FIELDS.map(({ key, label }) => (
          <div key={key} className={styles.colorRow}>
            {label}
            <label className={styles.colorInput}>
              <input
                type="color"
                value={theme[key]}
                onChange={(e) => onChange({ ...theme, [key]: e.target.value.toUpperCase() })}
                aria-label={`${label} color`}
              />
              {theme[key].toUpperCase()}
            </label>
          </div>
        ))}
      </div>

      <label className={`field ${styles.group}`}>
        <span className={styles.groupTitle}>Font</span>
        <select className="select" value={theme.font} onChange={(e) => onChange({ ...theme, font: e.target.value })}>
          {FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Background image</div>
        <p className={styles.muted}>
          Images and custom CSS <span className="badge badge-soon">Coming soon</span>
        </p>
      </div>
    </>
  );
}

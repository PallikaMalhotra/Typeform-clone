"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { Menu } from "@/components/ui/Menu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { publicFormUrl } from "@/lib/format";
import type { Form } from "@/lib/types";
import { FormEditorProvider, useFormEditor, type SaveState } from "./FormEditorContext";
import styles from "./editor.module.css";

const TABS = [
  { slug: "create", label: "Create" },
  { slug: "workflow", label: "Workflow" },
  { slug: "connect", label: "Connect" },
  { slug: "share", label: "Share" },
  { slug: "results", label: "Results" },
];

/** Loads the form and renders the editor chrome shared by all tabs. */
export function FormEditorShell({ formId, children }: { formId: string; children: ReactNode }) {
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);

  useEffect(() => {
    api
      .getForm(formId)
      .then(setForm)
      .catch((err) => setError({ message: err.message, notFound: err instanceof ApiError && err.status === 404 }));
  }, [formId]);

  if (error) {
    return (
      <div className="page-center">
        <h1 style={{ margin: 0, color: "var(--text)" }}>
          {error.notFound ? "Form not found" : "Couldn't load this form"}
        </h1>
        <p style={{ margin: 0 }}>{error.notFound ? "It may have been deleted." : error.message}</p>
        <Link href="/" className="btn btn-primary">
          Back to my workspace
        </Link>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    );
  }
  return (
    <FormEditorProvider initial={form}>
      <EditorChrome>{children}</EditorChrome>
    </FormEditorProvider>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const labels: Record<SaveState, string> = {
    saved: "All changes saved",
    unsaved: "Unsaved changes",
    saving: "Saving...",
    error: "Not saved",
  };
  return (
    <span className={`${styles.saveState} ${state === "error" ? styles.error : ""}`} aria-live="polite">
      {state === "saved" && <Icon name="check" size={14} />}
      {labels[state]}
    </span>
  );
}

function EditorChrome({ children }: { children: ReactNode }) {
  const { form, update, saveState, flush, setPublished } = useFormEditor();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(form.title);
  const [publishing, setPublishing] = useState(false);
  const published = form.status === "published";

  useEffect(() => setTitle(form.title), [form.title]);

  const commitTitle = () => {
    const next = title.trim();
    if (!next) return setTitle(form.title);
    if (next !== form.title) update((d) => ({ ...d, title: next }));
  };

  const togglePublish = async (publish: boolean) => {
    setPublishing(true);
    try {
      await setPublished(publish);
      if (publish) {
        toast.success("Your form is live! Share the link to collect responses.");
        router.push(`/forms/${form.id}/share`);
      } else {
        toast.success("Form unpublished. It no longer accepts responses.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicFormUrl(form.slug));
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy. Open the Share tab to copy the link manually.");
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.left}>
          <Logo compact />
          <Link href="/" className={styles.crumb} onClick={() => void flush()}>
            My workspace
          </Link>
          <span className={styles.crumb}>/</span>
          <input
            className={styles.titleInput}
            value={title}
            size={Math.min(Math.max(title.length, 6), 34)}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="Form name"
            maxLength={255}
          />
        </div>

        <nav className={styles.tabs} aria-label="Form sections">
          {TABS.map((tab) => {
            const href = `/forms/${form.id}/${tab.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={tab.slug}
                href={href}
                className={`${styles.tab} ${active ? styles.active : ""}`}
                onClick={() => void flush()}
              >
                {tab.label}
                {tab.slug === "results" && form.response_count > 0 && (
                  <span className={styles.tabCount}>{form.response_count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.right}>
          <SaveIndicator state={saveState} />
          {saveState === "error" && (
            <button className="btn btn-sm btn-secondary" onClick={() => void flush()}>
              Retry
            </button>
          )}
          <ThemeToggle />
          {published ? (
            <Menu
              trigger={({ toggle }) => (
                <button className="btn btn-secondary" onClick={toggle}>
                  <span style={{ color: "var(--success)" }}>●</span> Published <Icon name="chevronDown" size={16} />
                </button>
              )}
            >
              {(close) => (
                <>
                  <button
                    className="menu-item"
                    onClick={() => {
                      close();
                      void copyLink();
                    }}
                  >
                    <Icon name="link" /> Copy link
                  </button>
                  <a
                    className="menu-item"
                    href={`/to/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                  >
                    <Icon name="external" /> Open live form
                  </a>
                  <div className="menu-sep" />
                  <button
                    className="menu-item danger"
                    onClick={() => {
                      close();
                      void togglePublish(false);
                    }}
                    disabled={publishing}
                  >
                    <Icon name="eye" /> Unpublish
                  </button>
                </>
              )}
            </Menu>
          ) : (
            <button className="btn btn-primary" onClick={() => togglePublish(true)} disabled={publishing}>
              {publishing ? "Publishing..." : "Publish"}
            </button>
          )}
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

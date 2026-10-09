"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { Form, FormDefinition } from "@/lib/types";

export type SaveState = "saved" | "unsaved" | "saving" | "error";

interface FormEditor {
  form: Form;
  /** Change the definition locally; it is autosaved shortly after. */
  update: (change: (definition: FormDefinition) => FormDefinition) => void;
  saveState: SaveState;
  /** Save pending changes now (e.g. before publishing). */
  flush: () => Promise<boolean>;
  setPublished: (published: boolean) => Promise<void>;
  /** Re-fetch server-side metadata such as the response count. */
  refresh: () => Promise<void>;
}

const EditorContext = createContext<FormEditor | null>(null);
const AUTOSAVE_DELAY_MS = 700;

const definitionOf = (form: Form): FormDefinition => ({
  title: form.title,
  settings: form.settings,
  questions: form.questions,
});

export function FormEditorProvider({ initial, children }: { initial: Form; children: ReactNode }) {
  const toast = useToast();
  const [form, setForm] = useState<Form>(initial);
  const [saveState, setSaveState] = useState<SaveState>("saved");

  // The latest local definition and whether it differs from the server's.
  const latest = useRef<FormDefinition>(definitionOf(initial));
  const dirty = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
    // Saves are serialised: wait for the running one, then send what's newest.
    if (inFlight.current) await inFlight.current;
    if (!dirty.current) return true;

    const run = (async () => {
      dirty.current = false;
      setSaveState("saving");
      try {
        const saved = await api.saveForm(initial.id, latest.current);
        // Keep local content (the user may have kept typing); take server metadata.
        setForm((current) => ({
          ...current,
          status: saved.status,
          updated_at: saved.updated_at,
          published_at: saved.published_at,
          response_count: saved.response_count,
        }));
        setSaveState(dirty.current ? "unsaved" : "saved");
        return true;
      } catch (err) {
        dirty.current = true;
        setSaveState("error");
        toast.error(err instanceof Error ? `Couldn't save: ${err.message}` : "Couldn't save your changes");
        return false;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [initial.id, toast]);

  const update = useCallback(
    (change: (definition: FormDefinition) => FormDefinition) => {
      const next = change(latest.current);
      latest.current = next;
      dirty.current = true;
      setForm((current) => ({ ...current, ...next }));
      setSaveState("unsaved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    },
    [save],
  );

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    return save();
  }, [save]);

  const setPublished = useCallback(
    async (published: boolean) => {
      if (!(await flush())) return;
      const updated = published ? await api.publishForm(initial.id) : await api.unpublishForm(initial.id);
      setForm((current) => ({ ...current, status: updated.status, published_at: updated.published_at }));
    },
    [flush, initial.id],
  );

  const refresh = useCallback(async () => {
    const fresh = await api.getForm(initial.id);
    setForm((current) => ({ ...current, response_count: fresh.response_count, status: fresh.status }));
  }, [initial.id]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Save when the editor unmounts (e.g. navigating back to the workspace).
  useEffect(() => () => void flush(), [flush]);

  const value = useMemo(
    () => ({ form, update, saveState, flush, setPublished, refresh }),
    [form, update, saveState, flush, setPublished, refresh],
  );
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useFormEditor(): FormEditor {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useFormEditor must be used inside <FormEditorProvider>");
  return ctx;
}

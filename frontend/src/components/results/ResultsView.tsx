"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormEditor } from "@/components/editor/FormEditorContext";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDuration, pluralize } from "@/lib/format";
import type { FormResponse, FormSummaryStats, ResponseList } from "@/lib/types";
import { ResponseDrawer } from "./ResponseDrawer";
import { ResponsesTable } from "./ResponsesTable";
import { SummaryView } from "./SummaryView";
import styles from "./results.module.css";

type Tab = "summary" | "responses";

export function ResultsView() {
  const { form, refresh } = useFormEditor();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("summary");
  const [showPartial, setShowPartial] = useState(false);
  const [stats, setStats] = useState<FormSummaryStats | null>(null);
  const [list, setList] = useState<ResponseList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<FormResponse | null>(null);
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [summary, responses] = await Promise.all([
        api.getSummary(form.id),
        api.listResponses(form.id, !showPartial),
      ]);
      setStats(summary);
      setList(responses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load results");
    }
  }, [form.id, showPartial]);

  useEffect(() => {
    void load();
    setSelected(new Set());
  }, [load]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((current) =>
      list && current.size < list.items.length ? new Set(list.items.map((r) => r.id)) : new Set(),
    );

  const deleteResponses = async (ids: string[]) => {
    try {
      const { deleted } = await api.deleteResponses(form.id, ids);
      toast.success(`${pluralize(deleted, "response")} deleted`);
      setSelected(new Set());
      setOpen(null);
      await Promise.all([load(), refresh()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete responses");
    }
  };

  if (error && !stats) {
    return (
      <div className="page-center">
        <p style={{ margin: 0 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }
  if (!stats || !list) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    );
  }

  const { insights } = stats;
  return (
    <div className={styles.page}>
      <div className={styles.insights}>
        <div className={styles.insight}>
          <div className={styles.insightValue}>{insights.starts}</div>
          <div className={styles.insightLabel}>Starts</div>
        </div>
        <div className={styles.insight}>
          <div className={styles.insightValue}>{insights.submissions}</div>
          <div className={styles.insightLabel}>Submissions</div>
        </div>
        <div className={styles.insight}>
          <div className={styles.insightValue}>{insights.completion_rate}%</div>
          <div className={styles.insightLabel}>Completion rate</div>
        </div>
        <div className={styles.insight}>
          <div className={styles.insightValue}>{formatDuration(insights.average_time_seconds)}</div>
          <div className={styles.insightLabel}>Time to complete</div>
        </div>
      </div>

      <div className={styles.top}>
        <div className={styles.tabs} role="tablist">
          <button role="tab" aria-selected={tab === "summary"} onClick={() => setTab("summary")}>
            Summary
          </button>
          <button role="tab" aria-selected={tab === "responses"} onClick={() => setTab("responses")}>
            Responses
          </button>
        </div>
        <div className={styles.actions}>
          <button className="btn btn-sm btn-ghost" onClick={() => void load()} title="Refresh">
            Refresh
          </button>
          <a className="btn btn-sm btn-secondary" href={api.exportCsvUrl(form.id)} download>
            <Icon name="download" size={14} /> Export CSV
          </a>
        </div>
      </div>

      {tab === "summary" && <SummaryView stats={stats} />}

      {tab === "responses" && (
        <>
          <div className={styles.top}>
            <div className={styles.tabs}>
              <button aria-selected={!showPartial} onClick={() => setShowPartial(false)}>
                Completed ({insights.submissions})
              </button>
              <button aria-selected={showPartial} onClick={() => setShowPartial(true)}>
                Partial ({insights.starts - insights.submissions})
              </button>
            </div>
            {selected.size > 0 && (
              <button className="btn btn-sm btn-danger" onClick={() => setToDelete([...selected])}>
                <Icon name="trash" size={14} /> Delete {pluralize(selected.size, "response")}
              </button>
            )}
          </div>
          {list.items.length === 0 ? (
            <div className={`${styles.card} ${styles.empty}`}>
              {showPartial ? "No partial responses." : "No responses yet. Share your form to start collecting them."}
            </div>
          ) : (
            <ResponsesTable
              responses={list.items}
              questions={form.questions}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onOpen={setOpen}
            />
          )}
          {list.total > list.items.length && (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>
              Showing the {list.items.length} most recent of {list.total}. Export CSV to get all of them.
            </p>
          )}
        </>
      )}

      <ResponseDrawer
        response={open}
        questions={form.questions}
        onClose={() => setOpen(null)}
        onDelete={(r) => setToDelete([r.id])}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={toDelete && toDelete.length > 1 ? `Delete ${toDelete.length} responses?` : "Delete this response?"}
        danger
        confirmLabel="Delete"
        message="Deleted responses can't be recovered."
        onConfirm={() => (toDelete ? deleteResponses(toDelete) : undefined)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

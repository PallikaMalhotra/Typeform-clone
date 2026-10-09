"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { ConfirmDialog, PromptDialog } from "@/components/ui/Modal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDate, pluralize, publicFormUrl } from "@/lib/format";
import type { FormListItem } from "@/lib/types";
import { CreateFormDialog } from "./CreateFormDialog";
import { FormActionsMenu, type FormAction } from "./FormActionsMenu";
import styles from "./workspace.module.css";

type Sort = "updated" | "created" | "title";
type View = "list" | "grid";

const VIEW_KEY = "tf-workspace-view";

function StatusBadge({ status }: { status: FormListItem["status"] }) {
  return status === "published" ? (
    <span className="badge badge-success">● Published</span>
  ) : (
    <span className="badge">Draft</span>
  );
}

function Thumb({ form }: { form: FormListItem }) {
  return (
    <span className={styles.thumb} style={{ background: form.theme.background, color: form.theme.answer }}>
      Aa
    </span>
  );
}

export function Workspace() {
  const router = useRouter();
  const toast = useToast();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("updated");
  const [view, setView] = useState<View>("list");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<FormListItem | null>(null);
  const [deleting, setDeleting] = useState<FormListItem | null>(null);
  const [me, setMe] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      // Storage unavailable: keep the default view.
    }
  }, []);

  const changeView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  };

  const load = useCallback(async () => {
    try {
      setForms(await api.listForms({ search, sort }));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load forms");
    }
  }, [search, sort]);

  useEffect(() => {
    // Debounce typing in the search box.
    const id = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  const createForm = async (title: string) => {
    try {
      const form = await api.createForm(title);
      router.push(`/forms/${form.id}/create`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the form");
      throw err;
    }
  };

  const onAction = async (action: FormAction, form: FormListItem) => {
    try {
      switch (action) {
        case "open":
          return router.push(`/forms/${form.id}/create`);
        case "results":
          return router.push(`/forms/${form.id}/results`);
        case "share":
          return router.push(`/forms/${form.id}/share`);
        case "rename":
          return setRenaming(form);
        case "delete":
          return setDeleting(form);
        case "copy-link":
          await navigator.clipboard.writeText(publicFormUrl(form.slug));
          return toast.success("Link copied to clipboard");
        case "duplicate":
          await api.duplicateForm(form.id);
          toast.success(`"${form.title}" duplicated`);
          return load();
        case "toggle-publish":
          if (form.status === "published") await api.unpublishForm(form.id);
          else await api.publishForm(form.id);
          toast.success(form.status === "published" ? "Form unpublished" : "Form published");
          return load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const totalResponses = forms?.reduce((sum, f) => sum + f.response_count, 0) ?? 0;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Logo />
        <div className={styles.headerRight}>
          <ThemeToggle />
          <span className={styles.avatar} title={me ? `${me.name} · ${me.email}` : undefined}>
            {me?.name.charAt(0).toUpperCase() ?? ""}
          </span>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <button className={`btn btn-primary ${styles.createBtn}`} onClick={() => setCreating(true)}>
          <Icon name="plus" /> Create a new form
        </button>
        <nav className={styles.sideSection}>
          <div className={styles.sideTitle}>Workspaces</div>
          <button className={`${styles.sideItem} ${styles.active}`}>
            <Icon name="folder" /> My workspace
            <span className={styles.sideCount}>{forms?.length ?? ""}</span>
          </button>
          <button className={styles.sideItem} onClick={() => toast.info("Shared workspaces are coming soon")}>
            <Icon name="users" /> Shared with me
            <span className="badge badge-soon" style={{ marginLeft: "auto" }}>
              Soon
            </span>
          </button>
        </nav>
        <nav className={styles.sideSection}>
          <div className={styles.sideTitle}>Team</div>
          <button className={styles.sideItem} onClick={() => toast.info("Team collaboration is coming soon")}>
            <Icon name="plus" /> Invite your team
          </button>
        </nav>
        <div className={styles.sideSection} style={{ marginTop: "auto" }}>
          <div className={styles.sideItem} style={{ cursor: "default" }}>
            <Icon name="chart" /> {pluralize(totalResponses, "response")} collected
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <h1 className={styles.mainTitle}>My workspace</h1>
          <button className="btn btn-secondary" onClick={() => toast.info("Team collaboration is coming soon")}>
            <Icon name="users" /> Invite
          </button>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span className={styles.searchIcon}>
              <Icon name="search" size={16} />
            </span>
            <input
              className="input"
              placeholder="Search forms"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search forms"
            />
          </label>
          <select
            className="select"
            style={{ width: "auto" }}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort forms"
          >
            <option value="updated">Last updated</option>
            <option value="created">Date created</option>
            <option value="title">Alphabetical</option>
          </select>
          <div className={styles.viewToggle}>
            <button aria-pressed={view === "list"} onClick={() => changeView("list")} aria-label="List view">
              <Icon name="list" size={16} />
            </button>
            <button aria-pressed={view === "grid"} onClick={() => changeView("grid")} aria-label="Grid view">
              <Icon name="grid" size={16} />
            </button>
          </div>
          <button
            className="btn btn-primary hide-desktop"
            onClick={() => setCreating(true)}
            aria-label="Create a new form"
          >
            <Icon name="plus" />
          </button>
        </div>

        {loadError && !forms && (
          <div className={styles.empty}>
            <h2>Couldn&apos;t load your forms</h2>
            <p style={{ margin: 0 }}>{loadError}</p>
            <button className="btn btn-primary" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!forms && !loadError && (
          <div className={styles.table}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.row}>
                <div className={styles.formCell}>
                  <div className="skeleton" style={{ width: 44, height: 44 }} />
                  <div className="skeleton" style={{ width: "50%", height: 14 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {forms && forms.length === 0 && (
          <div className={styles.empty}>
            <h2>{search ? "No forms match your search" : "No forms yet"}</h2>
            <p style={{ margin: 0 }}>
              {search ? "Try another name." : "Create your first form and start collecting responses."}
            </p>
            {!search && (
              <button className="btn btn-primary" onClick={() => setCreating(true)}>
                <Icon name="plus" /> Create a new form
              </button>
            )}
          </div>
        )}

        {forms && forms.length > 0 && view === "list" && (
          <div className={styles.table} role="table">
            <div className={`${styles.row} ${styles.headRow}`} role="row">
              <span>Form</span>
              <span className={styles.hideSm}>Status</span>
              <span>Responses</span>
              <span className={styles.hideSm}>Updated</span>
              <span />
            </div>
            {forms.map((form) => (
              <div
                key={form.id}
                className={`${styles.row} ${styles.bodyRow}`}
                role="row"
                onClick={() => router.push(`/forms/${form.id}/create`)}
              >
                <div className={styles.formCell}>
                  <Thumb form={form} />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.formName}>{form.title}</div>
                    <div className={styles.formMeta}>{pluralize(form.question_count, "question")}</div>
                  </div>
                </div>
                <span className={styles.hideSm}>
                  <StatusBadge status={form.status} />
                </span>
                <span
                  className={styles.numCell}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/forms/${form.id}/results`);
                  }}
                >
                  {form.response_count || <span className={styles.muted}>–</span>}
                </span>
                <span className={`${styles.muted} ${styles.hideSm}`}>{formatDate(form.updated_at)}</span>
                <FormActionsMenu form={form} onAction={onAction} />
              </div>
            ))}
          </div>
        )}

        {forms && forms.length > 0 && view === "grid" && (
          <div className={styles.grid}>
            {forms.map((form) => (
              <div key={form.id} className={styles.card} onClick={() => router.push(`/forms/${form.id}/create`)}>
                <div
                  className={styles.cardPreview}
                  style={{ background: form.theme.background, color: form.theme.question }}
                >
                  {form.title}
                </div>
                <div className={styles.cardFooter}>
                  <span>
                    {pluralize(form.response_count, "response")} · <StatusBadge status={form.status} />
                  </span>
                  <FormActionsMenu form={form} onAction={onAction} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateFormDialog open={creating} onClose={() => setCreating(false)} onCreate={createForm} />
      <PromptDialog
        open={!!renaming}
        title="Rename form"
        label="Form name"
        initialValue={renaming?.title ?? ""}
        onSubmit={async (title) => {
          if (!renaming) return;
          try {
            await api.renameForm(renaming.id, title);
            toast.success("Form renamed");
            await load();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not rename the form");
          }
        }}
        onClose={() => setRenaming(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete this form?"
        danger
        confirmLabel="Delete"
        message={
          <>
            <strong>{deleting?.title}</strong> and its {pluralize(deleting?.response_count ?? 0, "response")} will be
            deleted permanently. This can&apos;t be undone.
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.deleteForm(deleting.id);
            toast.success("Form deleted");
            await load();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete the form");
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

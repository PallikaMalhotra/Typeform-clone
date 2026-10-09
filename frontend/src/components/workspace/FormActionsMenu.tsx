"use client";

import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import type { FormListItem } from "@/lib/types";

export type FormAction =
  "open" | "results" | "share" | "rename" | "duplicate" | "copy-link" | "toggle-publish" | "delete";

interface FormActionsMenuProps {
  form: FormListItem;
  onAction: (action: FormAction, form: FormListItem) => void;
}

export function FormActionsMenu({ form, onAction }: FormActionsMenuProps) {
  const published = form.status === "published";
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Menu
        trigger={({ toggle, open }) => (
          <button className="icon-btn" onClick={toggle} aria-label={`Actions for ${form.title}`} aria-expanded={open}>
            <Icon name="more" size={20} strokeWidth={3} />
          </button>
        )}
      >
        {(close) => {
          const run = (action: FormAction) => () => {
            close();
            onAction(action, form);
          };
          return (
            <>
              <button className="menu-item" onClick={run("open")}>
                <Icon name="edit" /> Open
              </button>
              <button className="menu-item" onClick={run("results")}>
                <Icon name="chart" /> Results
              </button>
              <button className="menu-item" onClick={run("share")}>
                <Icon name="share" /> Share
              </button>
              {published && (
                <button className="menu-item" onClick={run("copy-link")}>
                  <Icon name="link" /> Copy link
                </button>
              )}
              <div className="menu-sep" />
              <button className="menu-item" onClick={run("rename")}>
                <Icon name="edit" /> Rename
              </button>
              <button className="menu-item" onClick={run("duplicate")}>
                <Icon name="copy" /> Duplicate
              </button>
              <button className="menu-item" onClick={run("toggle-publish")}>
                <Icon name={published ? "eye" : "external"} /> {published ? "Unpublish" : "Publish"}
              </button>
              <div className="menu-sep" />
              <button className="menu-item danger" onClick={run("delete")}>
                <Icon name="trash" /> Delete
              </button>
            </>
          );
        }}
      </Menu>
    </span>
  );
}

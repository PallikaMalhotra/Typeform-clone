"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { publicFormUrl } from "@/lib/format";
import { useFormEditor } from "./FormEditorContext";
import styles from "./editor.module.css";

export function ShareView() {
  const { form, setPublished } = useFormEditor();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const published = form.status === "published";

  // window.location is only available in the browser.
  useEffect(() => setUrl(publicFormUrl(form.slug)), [form.slug]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied to clipboard`);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const embedCode = `<iframe src="${url}" width="100%" height="560" style="border:0" title="${form.title.replace(/"/g, "&quot;")}"></iframe>`;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Share your form</h1>
      <p className={styles.pageLead}>Anyone with the link can fill in the form. No account needed.</p>

      {!published && (
        <div
          className={styles.panel}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            background: "var(--warning-soft)",
          }}
        >
          <span>
            <strong>This form is a draft.</strong> Publish it so the link starts accepting responses.
          </span>
          <button
            className="btn btn-primary"
            onClick={() =>
              setPublished(true)
                .then(() => toast.success("Your form is live!"))
                .catch((err) => toast.error(err.message))
            }
          >
            Publish
          </button>
        </div>
      )}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Share link</h2>
        <div className={styles.linkRow}>
          <input
            className={`input ${styles.linkInput}`}
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            aria-label="Public link"
          />
          <button className="btn btn-primary" onClick={() => copy(url, "Link")}>
            <Icon name="copy" size={16} /> Copy link
          </button>
          <a className="btn btn-secondary" href={`/to/${form.slug}`} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={16} /> Open
          </a>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Embed in a web page</h2>
        <textarea
          className="textarea"
          readOnly
          value={embedCode}
          rows={3}
          style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}
          aria-label="Embed code"
        />
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={() => copy(embedCode, "Embed code")}>
            Copy code
          </button>
        </div>
      </section>

      <div className={styles.cards}>
        {[
          {
            icon: "share" as const,
            title: "Share on social",
            text: "Post your form to social networks with a preview card.",
          },
          {
            icon: "users" as const,
            title: "Email invitations",
            text: "Send personalised invitations and track who answered.",
          },
          { icon: "grid" as const, title: "QR code", text: "Print a QR code that opens your form." },
        ].map((card) => (
          <div key={card.title} className={styles.card}>
            <span className={styles.cardIcon}>
              <Icon name={card.icon} />
            </span>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <span className="badge badge-soon">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

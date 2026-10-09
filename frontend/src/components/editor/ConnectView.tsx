import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./editor.module.css";

const INTEGRATIONS: { icon: IconName; title: string; text: string }[] = [
  { icon: "link", title: "Webhooks", text: "POST every new response to your own endpoint in real time." },
  { icon: "grid", title: "Spreadsheets", text: "Sync responses to a spreadsheet as they arrive." },
  { icon: "users", title: "Team chat", text: "Get a message in your team channel for each submission." },
  { icon: "plug", title: "Automation tools", text: "Trigger workflows in thousands of apps." },
  { icon: "chart", title: "Analytics", text: "Send form events to your analytics provider." },
  { icon: "folder", title: "CRM", text: "Create or update contacts from responses." },
];

/** Placeholder for integrations (out of scope for this project). */
export function ConnectView() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Connect</h1>
      <p className={styles.pageLead}>Send your responses to the tools you already use.</p>
      <div className={styles.cards}>
        {INTEGRATIONS.map((item) => (
          <div key={item.title} className={styles.card}>
            <span className={styles.cardIcon}>
              <Icon name={item.icon} />
            </span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <span className="badge badge-soon">Coming soon</span>
          </div>
        ))}
      </div>
      <p className={styles.pageLead} style={{ marginTop: 24 }}>
        Meanwhile, you can export responses as CSV from the Results tab.
      </p>
    </div>
  );
}

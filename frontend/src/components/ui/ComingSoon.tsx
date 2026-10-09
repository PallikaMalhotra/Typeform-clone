import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface ComingSoonProps {
  icon: IconName;
  title: string;
  children?: ReactNode;
}

export function ComingSoon({ icon, title, children }: ComingSoonProps) {
  return (
    <div className="coming-soon">
      <Icon name={icon} size={32} />
      <h3>{title}</h3>
      <span className="badge badge-soon">Coming soon</span>
      {children && <p style={{ maxWidth: 420, margin: 0 }}>{children}</p>}
    </div>
  );
}

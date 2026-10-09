import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 19, fontWeight: 700, letterSpacing: "-0.03em" }}
      aria-label={`${BRAND} home`}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect width="22" height="22" rx="6" fill="currentColor" />
        <path d="M6 7h10M6 11h7M6 15h4" stroke="var(--surface)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      {!compact && BRAND}
    </Link>
  );
}

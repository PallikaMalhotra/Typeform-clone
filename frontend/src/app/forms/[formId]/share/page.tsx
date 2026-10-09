import type { Metadata } from "next";
import { ShareView } from "@/components/editor/ShareView";

export const metadata: Metadata = { title: "Share" };

export default function SharePage() {
  return <ShareView />;
}

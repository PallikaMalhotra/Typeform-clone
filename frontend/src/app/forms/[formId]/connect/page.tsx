import type { Metadata } from "next";
import { ConnectView } from "@/components/editor/ConnectView";

export const metadata: Metadata = { title: "Connect" };

export default function ConnectPage() {
  return <ConnectView />;
}

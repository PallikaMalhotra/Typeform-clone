import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/Workspace";

export const metadata: Metadata = { title: "My workspace" };

export default function HomePage() {
  return <Workspace />;
}

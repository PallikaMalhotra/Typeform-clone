import type { Metadata } from "next";
import { WorkflowView } from "@/components/editor/WorkflowView";

export const metadata: Metadata = { title: "Workflow" };

export default function WorkflowPage() {
  return <WorkflowView />;
}

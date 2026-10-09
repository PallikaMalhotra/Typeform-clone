import type { ReactNode } from "react";
import { FormEditorShell } from "@/components/editor/FormEditorShell";

export default async function FormLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <FormEditorShell formId={formId}>{children}</FormEditorShell>;
}

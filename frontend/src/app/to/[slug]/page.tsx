import type { Metadata } from "next";
import { PublicForm } from "@/components/runner/PublicForm";

export const metadata: Metadata = { title: "Form" };

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicForm slug={slug} />;
}

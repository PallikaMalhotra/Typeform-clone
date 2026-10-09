import type { Metadata } from "next";
import { Builder } from "@/components/builder/Builder";

export const metadata: Metadata = { title: "Create" };

export default function CreatePage() {
  return <Builder />;
}

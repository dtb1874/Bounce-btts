import { notFound } from "next/navigation";
import PreviewClient from "./PreviewClient";

export const dynamic = "force-dynamic";

export default function UiFoundationPreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <PreviewClient />;
}

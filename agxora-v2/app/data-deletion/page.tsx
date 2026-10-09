import type { Metadata } from "next";
import type { JSX } from "react";
import { DataDeletionPageContent } from "./DataDeletionPageContent";

export const metadata: Metadata = {
  title: "User data deletion",
  description:
    "How to delete or request deletion of personal data held in an AGXORA account.",
  alternates: { canonical: "/data-deletion" },
  openGraph: {
    title: "User data deletion · AGXORA",
    description:
      "How to delete or request deletion of personal data held in an AGXORA account.",
    url: "/data-deletion",
  },
  twitter: {
    card: "summary",
    title: "User data deletion · AGXORA",
    description:
      "How to delete or request deletion of personal data held in an AGXORA account.",
  },
};

export default function DataDeletionPage(): JSX.Element {
  return <DataDeletionPageContent />;
}

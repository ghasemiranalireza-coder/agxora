import type { Metadata } from "next";
import type { JSX } from "react";
import { TermsPageContent } from "./TermsPageContent";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing use of the AGXORA AI Business Operating System.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service · AGXORA",
    description:
      "Terms governing use of the AGXORA AI Business Operating System.",
    url: "/terms",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service · AGXORA",
    description:
      "Terms governing use of the AGXORA AI Business Operating System.",
  },
};

export default function TermsPage(): JSX.Element {
  return <TermsPageContent />;
}

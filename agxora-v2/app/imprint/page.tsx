import type { Metadata } from "next";
import type { JSX } from "react";
import { ImprintPageContent } from "./ImprintPageContent";

export const metadata: Metadata = {
  title: "Imprint",
  description: "Legal imprint and company information for AGXORA.",
  alternates: { canonical: "/imprint" },
  openGraph: {
    title: "Imprint · AGXORA",
    description: "Legal imprint and company information for AGXORA.",
    url: "/imprint",
  },
  twitter: {
    card: "summary",
    title: "Imprint · AGXORA",
    description: "Legal imprint and company information for AGXORA.",
  },
};

export default function ImprintPage(): JSX.Element {
  return <ImprintPageContent />;
}

import type { Metadata } from "next";
import type { JSX } from "react";
import { CookiesPageContent } from "./CookiesPageContent";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How AGXORA uses cookies and similar technologies on the website and product.",
  alternates: { canonical: "/cookies" },
  openGraph: {
    title: "Cookie Policy · AGXORA",
    description:
      "How AGXORA uses cookies and similar technologies on the website and product.",
    url: "/cookies",
  },
  twitter: {
    card: "summary",
    title: "Cookie Policy · AGXORA",
    description:
      "How AGXORA uses cookies and similar technologies on the website and product.",
  },
};

export default function CookiesPage(): JSX.Element {
  return <CookiesPageContent />;
}

import type { Metadata } from "next";
import type { JSX } from "react";
import { PrivacyPageContent } from "./PrivacyPageContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How AGXORA collects, uses, and protects personal data for customers and visitors.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy · AGXORA",
    description:
      "How AGXORA collects, uses, and protects personal data for customers and visitors.",
    url: "/privacy",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy · AGXORA",
    description:
      "How AGXORA collects, uses, and protects personal data for customers and visitors.",
  },
};

export default function PrivacyPage(): JSX.Element {
  return <PrivacyPageContent />;
}

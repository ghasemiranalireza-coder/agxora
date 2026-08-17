import type { Metadata } from "next";
import type { JSX } from "react";
import { ContactPageContent } from "./ContactPageContent";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact AGXORA for company, support, and enterprise sales inquiries.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact · AGXORA",
    description:
      "Contact AGXORA for company, support, and enterprise sales inquiries.",
    url: "/contact",
  },
  twitter: {
    card: "summary",
    title: "Contact · AGXORA",
    description:
      "Contact AGXORA for company, support, and enterprise sales inquiries.",
  },
};

export default function ContactPage(): JSX.Element {
  return <ContactPageContent />;
}

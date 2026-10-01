import type { Metadata } from "next";
import type { JSX } from "react";
import { LegalFrameworkPage } from "./LegalFrameworkPage";

export const metadata: Metadata = {
  title: "Legal Framework",
  description:
    "AGXORA Legal Framework Version 1.1, including external platform authorization. Requires lawyer review before public launch.",
  alternates: { canonical: "/legal/framework" },
};

export default function Page(): JSX.Element {
  return <LegalFrameworkPage />;
}

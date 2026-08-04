import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY, formatCompanyAddress } from "../lib/company";

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
  return (
    <LegalPageShell title="Imprint" eyebrow="Legal">
      <p>
        Information according to applicable disclosure requirements (including
        § 5 TMG / equivalent). Placeholders below will be replaced with final
        registered entity details at launch.
      </p>

      <dl className="p39-legal__card">
        <div>
          <dt>Company</dt>
          <dd>{COMPANY.legalName}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{formatCompanyAddress()}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.company}`}>{COMPANY.email.company}</a>
          </dd>
        </div>
        <div>
          <dt>Support</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.support}`}>{COMPANY.email.support}</a>
          </dd>
        </div>
        <div>
          <dt>Represented by</dt>
          <dd>Managing Director (placeholder)</dd>
        </div>
        <div>
          <dt>Register</dt>
          <dd>Commercial register · Court · HRB (placeholder)</dd>
        </div>
        <div>
          <dt>VAT ID</dt>
          <dd>DE000000000 (placeholder)</dd>
        </div>
      </dl>

      <h2>Responsible for content</h2>
      <p>
        Editorial contact for this website: {COMPANY.legalName},{" "}
        {formatCompanyAddress()}.
      </p>

      <h2>Contact</h2>
      <p>
        Prefer a form? Visit <Link href="/contact">Contact</Link> or{" "}
        <Link href="/contact-sales">Contact Sales</Link> for enterprise inquiries.
      </p>
    </LegalPageShell>
  );
}

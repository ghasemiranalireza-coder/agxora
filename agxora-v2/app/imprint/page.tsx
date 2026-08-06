import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import {
  COMPANY,
  formatCompanyAddress,
  hasConfiguredAddress,
} from "../lib/company";

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

function valueOrPending(value: string): string {
  return value.trim() ? value : "Pending configuration";
}

export default function ImprintPage(): JSX.Element {
  return (
    <LegalPageShell title="Imprint" eyebrow="Legal">
      <p>
        Information according to applicable disclosure requirements. Configure
        production values with <code>NEXT_PUBLIC_AGXORA_*</code> environment
        variables before public launch.
      </p>

      <dl className="p39-legal__card">
        <div>
          <dt>Company</dt>
          <dd>{COMPANY.legalName}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>
            {hasConfiguredAddress()
              ? formatCompanyAddress()
              : "Pending configuration"}
          </dd>
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
          <dd>{valueOrPending(COMPANY.register.managingDirector)}</dd>
        </div>
        <div>
          <dt>Register</dt>
          <dd>
            {COMPANY.register.court || COMPANY.register.number
              ? [COMPANY.register.court, COMPANY.register.number]
                  .filter(Boolean)
                  .join(" · ")
              : "Pending configuration"}
          </dd>
        </div>
        <div>
          <dt>VAT ID</dt>
          <dd>{valueOrPending(COMPANY.register.vatId)}</dd>
        </div>
      </dl>

      <h2>Responsible for content</h2>
      <p>
        Editorial contact for this website: {COMPANY.legalName}
        {hasConfiguredAddress() ? `, ${formatCompanyAddress()}` : ""}.
      </p>

      <h2>Contact</h2>
      <p>
        Prefer a form? Visit <Link href="/contact">Contact</Link> or{" "}
        <Link href="/contact-sales">Contact Sales</Link> for enterprise inquiries.
      </p>
    </LegalPageShell>
  );
}

import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY, formatCompanyAddress } from "../lib/company";

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
  return (
    <LegalPageShell title="Contact" eyebrow="Company">
      <p>
        Reach the AGXORA team for product questions, support, or enterprise
        conversations. Prefer sales routing? Use{" "}
        <Link href="/contact-sales">Contact Sales</Link>.
      </p>

      <dl className="p39-legal__card">
        <div>
          <dt>Company email</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.company}`}>{COMPANY.email.company}</a>
          </dd>
        </div>
        <div>
          <dt>Support email</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.support}`}>{COMPANY.email.support}</a>
            <span style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 13 }}>
              Placeholder inbox — monitored at launch.
            </span>
          </dd>
        </div>
        <div>
          <dt>Sales</dt>
          <dd>
            <a href={`mailto:${COMPANY.email.sales}`}>{COMPANY.email.sales}</a>
            {" · "}
            <Link href="/contact-sales">Enterprise form</Link>
          </dd>
        </div>
        <div>
          <dt>Business address</dt>
          <dd>
            {COMPANY.legalName}
            <br />
            {formatCompanyAddress()}
            <span style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 13 }}>
              Placeholder address pending final registration details.
            </span>
          </dd>
        </div>
      </dl>

      <h2>Quick links</h2>
      <ul>
        <li>
          <Link href="/pricing">Pricing</Link>
        </li>
        <li>
          <Link href="/demo">Book a demo</Link>
        </li>
        <li>
          <Link href="/imprint">Imprint</Link>
        </li>
        <li>
          <Link href="/privacy">Privacy Policy</Link>
        </li>
      </ul>
    </LegalPageShell>
  );
}

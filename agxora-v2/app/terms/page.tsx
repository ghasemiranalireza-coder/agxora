import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY } from "../lib/company";

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
  return (
    <LegalPageShell title="Terms of Service" eyebrow="Legal">
      <p>
        These Terms of Service (“Terms”) govern access to and use of AGXORA
        products and websites operated by {COMPANY.legalName}. By creating an
        account or using the service, you agree to these Terms.
      </p>

      <h2>1. Accounts</h2>
      <p>
        You must provide accurate registration information, keep credentials
        secure, and are responsible for activity under your account. Organization
        administrators manage seats and access for their workspace.
      </p>

      <h2>2. Subscriptions and billing</h2>
      <p>
        Paid plans are billed according to the plan selected on{" "}
        <Link href="/pricing">Pricing</Link>. Enterprise agreements may supersede
        self-serve terms. Fees are non-refundable except where required by law or
        expressly agreed in writing.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not misuse the platform, attempt unauthorized access, or disrupt service.</li>
        <li>Do not upload unlawful content or infringe third-party rights.</li>
        <li>Comply with export, sanctions, and industry regulations that apply to you.</li>
      </ul>

      <h2>4. Customer data</h2>
      <p>
        You retain rights to your business content. You grant AGXORA a limited
        license to host and process that content solely to provide the service.
        Our <Link href="/privacy">Privacy Policy</Link> describes personal data
        handling.
      </p>

      <h2>5. AI features</h2>
      <p>
        AI outputs may be inaccurate or incomplete. You remain responsible for
        reviewing outputs before relying on them for business decisions.
      </p>

      <h2>6. Availability and changes</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service.
        We may update features and these Terms; material changes will be
        communicated through the product or email where appropriate.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, AGXORA is not liable for indirect,
        incidental, or consequential damages. Our aggregate liability for paid
        subscriptions is limited to fees paid in the twelve months preceding the
        claim.
      </p>

      <h2>8. Contact</h2>
      <p>
        Legal questions:{" "}
        <a href={`mailto:${COMPANY.email.company}`}>{COMPANY.email.company}</a> ·{" "}
        <Link href="/contact">Contact</Link> · <Link href="/imprint">Imprint</Link>
      </p>
    </LegalPageShell>
  );
}

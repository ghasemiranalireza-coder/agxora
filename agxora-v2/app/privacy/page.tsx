import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY } from "../lib/company";

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
  return (
    <LegalPageShell title="Privacy Policy" eyebrow="Legal">
      <p>
        This Privacy Policy explains how {COMPANY.legalName} (“AGXORA”, “we”, “us”)
        processes personal data when you visit {COMPANY.siteUrl}, create an account,
        or use the AGXORA platform.
      </p>

      <h2>1. Controller</h2>
      <p>
        {COMPANY.legalName}
        <br />
        {COMPANY.address.line1}, {COMPANY.address.line2}, {COMPANY.address.country}
        <br />
        Email:{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>
      </p>

      <h2>2. Data we process</h2>
      <ul>
        <li>Account data: name, email, organization, and role.</li>
        <li>Usage data: product interactions, device, and diagnostic logs.</li>
        <li>Billing data: plan, invoices, and payment references from providers.</li>
        <li>Support communications you send to us.</li>
      </ul>

      <h2>3. Purposes and legal bases</h2>
      <p>
        We process data to provide the service (contract), secure the platform
        (legitimate interest), meet legal obligations, and—where required—with
        your consent (for example optional analytics or marketing).
      </p>

      <h2>4. Retention</h2>
      <p>
        We retain personal data only as long as needed for the purposes above,
        including statutory retention for billing and security records, then delete
        or anonymize it.
      </p>

      <h2>5. Sharing</h2>
      <p>
        We use vetted processors (hosting, email, payments) under appropriate
        contracts. We do not sell personal data.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your location, you may request access, correction, deletion,
        restriction, portability, or objection. Contact{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>.
        You may also lodge a complaint with a supervisory authority.
      </p>

      <h2>7. Cookies</h2>
      <p>
        See our <Link href="/cookies">Cookie Policy</Link> for details on essential
        and optional cookies.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions: <Link href="/contact">Contact</Link> or{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>.
      </p>
    </LegalPageShell>
  );
}

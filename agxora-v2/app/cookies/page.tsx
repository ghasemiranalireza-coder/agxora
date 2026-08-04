import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import { LegalPageShell } from "../components/legal";
import { COMPANY } from "../lib/company";

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
  return (
    <LegalPageShell title="Cookie Policy" eyebrow="Legal · Placeholder">
      <p>
        This Cookie Policy describes how {COMPANY.name} uses cookies and similar
        technologies. A full consent manager will be enabled at public launch;
        this page documents the intended categories.
      </p>

      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small files stored on your device. They help the site
        function, remember preferences, and—where allowed—measure performance.
      </p>

      <h2>2. Categories we use</h2>
      <ul>
        <li>
          <strong>Essential</strong> — authentication, security, load balancing,
          and basic preferences. Required for the service.
        </li>
        <li>
          <strong>Functional</strong> — optional features such as remembered UI
          settings (when enabled).
        </li>
        <li>
          <strong>Analytics</strong> — aggregate usage measurement (only with
          consent where required).
        </li>
      </ul>

      <h2>3. Managing cookies</h2>
      <p>
        You can control non-essential cookies through browser settings and, once
        available, our on-site preference center. Blocking essential cookies may
        prevent sign-in or core product use.
      </p>

      <h2>4. More information</h2>
      <p>
        See the <Link href="/privacy">Privacy Policy</Link> or contact{" "}
        <a href={`mailto:${COMPANY.email.privacy}`}>{COMPANY.email.privacy}</a>.
      </p>
    </LegalPageShell>
  );
}

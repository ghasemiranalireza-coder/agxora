import type { Metadata } from "next";
import type { JSX } from "react";
import { Syne, Sora } from "next/font/google";
import { LandingPage } from "./components/landing";

const landingDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-landing-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const landingBody = Sora({
  subsets: ["latin"],
  variable: "--font-landing-body",
  display: "swap",
  weight: ["400", "500", "600"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_AGXORA_SITE_URL ?? "https://agxora.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    absolute: "AGXORA — Intelligent Business Operating System",
  },
  description:
    "AGXORA connects customers, finance, documents, and governed AI in one calm command center for founders and operators.",
  applicationName: "AGXORA",
  keywords: [
    "AGXORA",
    "business operating system",
    "enterprise AI platform",
    "CRM",
    "finance",
    "documents",
    "automation",
    "B2B SaaS",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AGXORA",
    title: "AGXORA — Intelligent Business Operating System",
    description:
      "Connect customers, finance, documents, and AI in one operating surface — start free when you are ready.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AGXORA — Intelligent Business Operating System",
    description:
      "An intelligent business operating system for founders and operators — start free.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AGXORA",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AGXORA is an intelligent business operating system connecting CRM, finance, documents, and governed AI.",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Start Free",
  },
};

export default function Home(): JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage
        className={`${landingDisplay.variable} ${landingBody.variable}`}
      />
    </>
  );
}

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
    absolute: "AGXORA — The AI Operating System for Your Business",
  },
  description:
    "Connect your business. Let AI operate it. AGXORA is the AI operating system for agents, integrations, and governed automation.",
  applicationName: "AGXORA",
  keywords: [
    "AGXORA",
    "AI operating system",
    "enterprise AI platform",
    "AI agents",
    "integrations",
    "automation",
    "business intelligence",
    "B2B SaaS",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AGXORA",
    title: "AGXORA — The AI Operating System for Your Business",
    description:
      "Connect your business. Let AI operate it. Gmail and YouTube are live today. Other providers ship honestly as they become available.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AGXORA — The AI Operating System for Your Business",
    description:
      "Connect your business. Let AI operate it — with human approval before send or publish.",
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
    "AGXORA is the AI operating system for your business — agents, integrations, and governed automation with human approval.",
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

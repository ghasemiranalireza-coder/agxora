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
    absolute: "AGXORA — AI Platform That Runs Your Business",
  },
  description:
    "AGXORA unifies AI, automation, and analytics for founders, operators, and enterprise teams — start free in minutes.",
  applicationName: "AGXORA",
  keywords: [
    "AGXORA",
    "enterprise AI platform",
    "business operating system",
    "automation",
    "analytics",
    "B2B SaaS",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AGXORA",
    title: "AGXORA — AI Platform That Runs Your Business",
    description:
      "AI, automation, and analytics in one system — built for founders, operators, and enterprise teams.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AGXORA — AI Platform That Runs Your Business",
    description:
      "AI, automation, and analytics in one system — start free in minutes.",
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
    "The AI platform that runs your business — AI, automation, and analytics in one system.",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
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

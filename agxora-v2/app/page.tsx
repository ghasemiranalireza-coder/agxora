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
    absolute: "AGXORA — The Enterprise Operating System",
  },
  description:
    "AGXORA is the enterprise operating system for AI, automation, analytics, and integrations — in one intelligent platform.",
  applicationName: "AGXORA",
  keywords: [
    "AGXORA",
    "enterprise operating system",
    "AI",
    "automation",
    "analytics",
    "integrations",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AGXORA",
    title: "AGXORA — The Enterprise Operating System",
    description:
      "Operate your business with AI, automation, analytics, and integrations in one platform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AGXORA — The Enterprise Operating System",
    description:
      "Operate your business with AI, automation, analytics, and integrations in one platform.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AGXORA",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "The enterprise operating system.",
  url: siteUrl,
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

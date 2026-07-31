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
    absolute: "AGXORA — Enterprise AI Operating System",
  },
  description:
    "AGXORA is the enterprise AI operating system for intelligence, automation, analytics, identity, and secure operations — ready for public launch.",
  applicationName: "AGXORA",
  keywords: [
    "AGXORA",
    "enterprise AI",
    "business operating system",
    "automation",
    "analytics",
    "AI agents",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AGXORA",
    title: "AGXORA — Enterprise AI Operating System",
    description:
      "Unify intelligence, automation, and governance in one secure enterprise AI platform.",
    images: [
      {
        url: "/alien-clean.png",
        width: 1200,
        height: 630,
        alt: "AGXORA — enterprise intelligence brand visual",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AGXORA — Enterprise AI Operating System",
    description:
      "Unify intelligence, automation, and governance in one secure enterprise AI platform.",
    images: ["/alien-clean.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AGXORA",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Enterprise AI operating system for intelligence, automation, analytics, and secure operations.",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Start free workspace",
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

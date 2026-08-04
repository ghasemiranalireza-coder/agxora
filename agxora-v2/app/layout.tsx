import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "./providers/AppProviders";
import { DEFAULT_LOCALE } from "./lib/i18n/locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_AGXORA_SITE_URL ?? "https://agxora.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AGXORA",
    template: "%s · AGXORA",
  },
  description:
    "AGXORA AI Business Operating System — enterprise AI, automation, and analytics.",
  applicationName: "AGXORA",
  keywords: [
    "AGXORA",
    "AI business OS",
    "enterprise SaaS",
    "automation",
    "analytics",
  ],
  authors: [{ name: "AGXORA" }],
  creator: "AGXORA",
  publisher: "AGXORA",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "AGXORA",
    title: "AGXORA — AI Business Operating System",
    description:
      "Enterprise AI, automation, and analytics in one production-ready platform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AGXORA — AI Business Operating System",
    description:
      "Enterprise AI, automation, and analytics in one production-ready platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "agxora:version": process.env.NEXT_PUBLIC_AGXORA_VERSION ?? "0.36.0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      translate="no"
      className={`notranslate ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#agxora-main" className="agx-skip-link">
          Skip to main content
        </a>
        <div
          id="agxora-live-region"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />
        <AppProviders>
          <div id="agxora-main">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Noto_Sans_Arabic, Noto_Sans_JP, Noto_Sans_SC } from "next/font/google";
import { AppProviders } from "./providers/AppProviders";
import { resolveServerLocale } from "./lib/i18n/cookie";
import {
  LOCALE_COOKIE,
  localeDirection,
  resolveMessage,
  toBcp47,
} from "./lib/i18n";
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

/** Persian/Arabic-capable face — activated via [dir=rtl] CSS variable swap. */
const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-agx-arabic",
  subsets: ["arabic"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** Simplified Chinese — activated via [data-locale=zh-CN|zh-TW] CSS variable swap. */
const notoSansSc = Noto_Sans_SC({
  variable: "--font-agx-cjk-sc",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** Japanese — activated via [data-locale=ja] CSS variable swap. */
const notoSansJp = Noto_Sans_JP({
  variable: "--font-agx-cjk-jp",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
    "agxora:version": process.env.NEXT_PUBLIC_AGXORA_VERSION ?? "0.39.0",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const initialLocale = resolveServerLocale(jar.get(LOCALE_COOKIE)?.value);
  const dir = localeDirection(initialLocale);
  const lang = toBcp47(initialLocale);
  const skipToMain = resolveMessage(initialLocale, "backend.skipToMain");

  return (
    <html
      lang={lang}
      dir={dir}
      data-locale={initialLocale}
      translate="no"
      className={`notranslate ${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} ${notoSansSc.variable} ${notoSansJp.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#agxora-main" className="agx-skip-link">
          {skipToMain}
        </a>
        <div
          id="agxora-live-region"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />
        <AppProviders initialLocale={initialLocale}>
          <div id="agxora-main">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}

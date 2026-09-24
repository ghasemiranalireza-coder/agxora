import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { AppProviders } from "./providers/AppProviders";
import { resolveServerLocale } from "./lib/i18n/cookie";
import {
  LOCALE_COOKIE,
  localeDirection,
  SkipToMainLink,
  toBcp47,
} from "./lib/i18n";
import "./globals.css";

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
  const headerList = await headers();
  const initialLocale = resolveServerLocale(
    jar.get(LOCALE_COOKIE)?.value,
    headerList.get("accept-language"),
  );
  const dir = localeDirection(initialLocale);
  const lang = toBcp47(initialLocale);

  return (
    <html
      lang={lang}
      dir={dir}
      data-locale={initialLocale}
      translate="no"
      className="notranslate h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <div
          id="agxora-live-region"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />
        <AppProviders initialLocale={initialLocale}>
          <SkipToMainLink />
          <div id="agxora-main">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}

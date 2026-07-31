import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "./providers/AppProviders";
import { DEFAULT_LOCALE } from "./lib/i18n/locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_AGXORA_SITE_URL ?? "https://agxora.app",
  ),
  title: {
    default: "AGXORA",
    template: "%s · AGXORA",
  },
  description: "AGXORA AI Business Operating System",
  applicationName: "AGXORA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Deterministic SSR: lang matches English UI copy.
  // translate="no" prevents browser auto-translate from mutating aria-labels
  // and other strings between server HTML and client hydration.
  return (
    <html
      lang={DEFAULT_LOCALE}
      translate="no"
      className={`notranslate ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

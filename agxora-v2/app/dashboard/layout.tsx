"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { serverAuthAdapter } from "../lib/auth";
import {
  buildLoginRedirectPath,
  isServerSessionRequired,
} from "../lib/auth/serverSessionGate";
import { useT } from "../lib/i18n";

/**
 * Dashboard shell — starfield + persistent AppShell.
 * Keeps sidebar / top nav / command palette mounted across module navigations.
 *
 * Production (and AGXORA_AUTH_REQUIRED=true) require the same httpOnly
 * server session that POST /api/v1/ai/chat uses via requireCurrentActor().
 */

const StarfieldBackground = dynamic(
  () => import("../components/StarfieldBackground"),
  { ssr: false },
);

const shellStyle: CSSProperties = {
  position: "relative",
  isolation: "isolate",
  minHeight: "100vh",
  background: "transparent",
};

const contentStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const requireServer = isServerSessionRequired();
  const [allowed, setAllowed] = useState(!requireServer);

  useEffect(() => {
    if (!requireServer) return;
    let cancelled = false;
    void (async () => {
      try {
        const session = await serverAuthAdapter.getSession();
        if (cancelled) return;
        if (!session) {
          router.replace(buildLoginRedirectPath(pathname || "/dashboard"));
          return;
        }
        setAllowed(true);
      } catch {
        if (!cancelled) {
          router.replace(buildLoginRedirectPath(pathname || "/dashboard"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requireServer, pathname, router]);

  if (requireServer && !allowed) {
    return (
      <div style={shellStyle}>
        <StarfieldBackground />
        <div
          style={{
            ...contentStyle,
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            color: "rgba(148,163,184,0.9)",
            fontSize: 14,
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          }}
        >
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <StarfieldBackground />
      <div style={contentStyle}>
        <AppShell>{children}</AppShell>
      </div>
    </div>
  );
}

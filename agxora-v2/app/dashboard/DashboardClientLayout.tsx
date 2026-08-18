"use client";

import dynamic from "next/dynamic";
import type { CSSProperties, ReactNode } from "react";
import { AppShell } from "../components/AppShell";

/**
 * Dashboard shell — starfield + persistent AppShell.
 * Keeps sidebar / top nav / command palette mounted across module navigations.
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

export function DashboardClientLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div style={shellStyle}>
      <StarfieldBackground />
      <div style={contentStyle}>
        <AppShell>{children}</AppShell>
      </div>
    </div>
  );
}

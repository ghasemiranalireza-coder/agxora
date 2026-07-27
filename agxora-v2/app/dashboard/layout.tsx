"use client";

import type { CSSProperties, ReactNode } from "react";
import StarfieldBackground from "../components/StarfieldBackground";

/**
 * Dashboard shell — procedural starfield root.
 * Theme is provided at the app root via AppProviders.
 */

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
  return (
    <div style={shellStyle}>
      <StarfieldBackground />
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

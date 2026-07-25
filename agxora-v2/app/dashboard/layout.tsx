"use client";

import type { CSSProperties, ReactNode } from "react";
import StarfieldBackground from "../components/StarfieldBackground";
import { ThemeProvider } from "../lib/theme";

/**
 * Dashboard shell — Adaptive Theme Engine + procedural starfield root.
 * Existing section structure is preserved; theme tokens drive surfaces.
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
    <ThemeProvider>
      <div style={shellStyle}>
        <StarfieldBackground />
        <div style={contentStyle}>{children}</div>
      </div>
    </ThemeProvider>
  );
}

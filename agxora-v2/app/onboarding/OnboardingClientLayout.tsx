"use client";

import type { CSSProperties, ReactNode } from "react";
import StarfieldBackground from "../components/StarfieldBackground";

const shellStyle: CSSProperties = {
  position: "relative",
  isolation: "isolate",
  minHeight: "100vh",
  background: "transparent",
};

const contentStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
};

export function OnboardingClientLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div style={shellStyle}>
      <StarfieldBackground />
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import StarfieldBackground from "../components/StarfieldBackground";

/**
 * Dashboard shell — mounts the procedural starfield once at the root so
 * every section (sidebar, globe, cards, AI chat, live activity) floats
 * above the same continuous space backdrop while scrolling.
 */

const shellStyle: CSSProperties = {
  position: "relative",
  isolation: "isolate",
  minHeight: "100vh",
  color: "white",
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

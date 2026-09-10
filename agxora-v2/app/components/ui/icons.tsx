import type { JSX } from "react";

/**
 * Inline stroke icon set — zero external assets, consistent 24×24 grid.
 */

export type IconName =
  | "activity"
  | "arrowRight"
  | "bell"
  | "bot"
  | "calendar"
  | "chart"
  | "check"
  | "circle"
  | "clock"
  | "euro"
  | "globe"
  | "grid"
  | "home"
  | "layers"
  | "megaphone"
  | "menu"
  | "moon"
  | "play"
  | "plug"
  | "search"
  | "send"
  | "settings"
  | "shield"
  | "sparkles"
  | "star"
  | "store"
  | "target"
  | "trendingUp"
  | "users"
  | "x"
  | "zap";

const PATHS: Record<IconName, JSX.Element> = {
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  bot: (
    <>
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" />
      <path d="M9.5 13v1.5" />
      <path d="M14.5 13v1.5" />
      <path d="M2 12v3" />
      <path d="M22 12v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 11h18" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15v3" />
      <path d="M12 10v8" />
      <path d="M17 6v12" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  circle: <circle cx="12" cy="12" r="9" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  euro: (
    <>
      <path d="M18.5 6A8 8 0 0 0 6.3 12a8 8 0 0 0 12.2 6" />
      <path d="M4 10h9" />
      <path d="M4 14h8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18a14.5 14.5 0 0 1 0-18" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 15-5v12L3 13z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      <path d="M21 9v4" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  play: <path d="M8 5.5v13l11-6.5z" />,
  plug: (
    <>
      <path d="M9 7V3" />
      <path d="M15 7V3" />
      <path d="M6 7h12v4a6 6 0 0 1-12 0z" />
      <path d="M12 17v4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.5-4.5" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4z" />
      <path d="M22 2 11 13" />
    </>
  ),
  settings: (
    <>
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M1 14h6" />
      <path d="M9 8h6" />
      <path d="M17 16h6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="m9 11.5 2 2 4-4.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.8 8.6 19 10.5l-5.2 1.9L12 17.5l-1.8-5.1L5 10.5l5.2-1.9z" />
      <path d="M19 3v3" />
      <path d="M17.5 4.5h3" />
      <path d="M5.5 17.5v3" />
      <path d="M4 19h3" />
    </>
  ),
  star: (
    <path d="m12 2.5 2.9 5.9 6.5 1-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-1z" />
  ),
  store: (
    <>
      <path d="M4 9 5.5 4h13L20 9" />
      <path d="M3 9h18" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  trendingUp: (
    <>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  zap: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
};

interface IconProps {
  readonly name: IconName;
  readonly className?: string;
  readonly strokeWidth?: number;
}

export function Icon({
  name,
  className,
  strokeWidth = 1.7,
}: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

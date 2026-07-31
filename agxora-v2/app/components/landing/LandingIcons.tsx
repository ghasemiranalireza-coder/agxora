import type { JSX } from "react";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function LandingIcon({
  name,
}: {
  readonly name: string;
}): JSX.Element {
  switch (name) {
    case "ai":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" {...stroke} />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" {...stroke} />
        </svg>
      );
    case "automation":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h10M14 7l3 3-3 3M20 17H10M10 17l-3-3 3-3" {...stroke} />
        </svg>
      );
    case "analytics":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" {...stroke} />
        </svg>
      );
    case "security":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" {...stroke} />
        </svg>
      );
    case "integrations":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 8h3v3H8zM13 13h3v3h-3zM8 13h3v3H8zM13 8h3v3h-3z" {...stroke} />
          <path d="M11 9.5h2M14.5 11v2M13 14.5h-2M9.5 13v-2" {...stroke} />
        </svg>
      );
    case "identity":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3" {...stroke} />
          <path d="M5 19c1.8-3.2 4-4.8 7-4.8S17.2 15.8 19 19" {...stroke} />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4l2.2 4.5L19 9.3l-3.5 3.4.8 4.8L12 15.4 7.7 17.5l.8-4.8L5 9.3l4.8-.8L12 4z" {...stroke} />
        </svg>
      );
  }
}

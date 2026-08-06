"use client";

import type { JSX, ReactNode } from "react";
import { BADGE_TONES, UI, type BadgeTone } from "./tokens";

export function Badge({
  children,
  tone = "default",
}: {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
}): JSX.Element {
  return (
    <span
      className="inline-flex items-center font-semibold tracking-wide"
      style={{
        ...BADGE_TONES[tone],
        borderRadius: UI.radius.pill,
        borderWidth: 1,
        borderStyle: "solid",
        padding: "4px 10px",
        fontSize: UI.typography.label,
        lineHeight: 1.35,
        minHeight: 24,
      }}
    >
      {children}
    </span>
  );
}

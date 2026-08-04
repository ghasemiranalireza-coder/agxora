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
        padding: "3px 10px",
        fontSize: 11,
        lineHeight: 1.35,
        minHeight: 22,
      }}
    >
      {children}
    </span>
  );
}

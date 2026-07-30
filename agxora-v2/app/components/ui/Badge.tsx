"use client";

import type { JSX, ReactNode } from "react";
import { BADGE_TONES, type BadgeTone } from "./tokens";

export function Badge({
  children,
  tone = "default",
}: {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
}): JSX.Element {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
      style={BADGE_TONES[tone]}
    >
      {children}
    </span>
  );
}

"use client";

import type { JSX } from "react";
import { useT } from "./LocaleProvider";

/**
 * Skip link that follows client-side locale changes (not a one-shot SSR string).
 */
export function SkipToMainLink({
  href = "#agxora-main",
  messageKey = "backend.skipToMain",
}: {
  readonly href?: string;
  readonly messageKey?: string;
}): JSX.Element {
  const t = useT();
  return (
    <a href={href} className="agx-skip-link">
      {t(messageKey)}
    </a>
  );
}

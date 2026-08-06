"use client";

import type { JSX, SVGAttributes } from "react";
import { UI } from "./tokens";

/**
 * Unified stroke icon — consistent size and stroke across AGXORA.
 */
export function Icon({
  path,
  size = "md",
  title,
  className = "",
  ...rest
}: {
  readonly path: string;
  readonly size?: "sm" | "md" | "lg";
  readonly title?: string;
  readonly className?: string;
} & Omit<SVGAttributes<SVGSVGElement>, "children" | "viewBox">): JSX.Element {
  const px =
    size === "sm"
      ? UI.control.iconSm
      : size === "lg"
        ? UI.control.iconLg
        : UI.control.icon;

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={`agx-ui-icon ${size === "sm" ? "agx-ui-icon--sm" : ""} ${className}`.trim()}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} />
    </svg>
  );
}

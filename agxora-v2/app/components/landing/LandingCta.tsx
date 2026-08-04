"use client";

import { useState, type JSX, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  readonly href: string;
  readonly children: ReactNode;
  readonly variant?: "primary" | "ghost";
  readonly size?: "md" | "sm";
  readonly className?: string;
};

/**
 * Landing CTA — real destinations only, with hover / focus / loading states.
 */
export function LandingCta({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: Props): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const loading = Boolean(pendingHref && pendingHref !== pathname);

  const classes = [
    "p31-btn",
    variant === "primary" ? "p31-btn--primary" : "p31-btn--ghost",
    size === "sm" ? "p31-btn--sm" : "",
    loading ? "is-loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={href}
      className={classes}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        if (href.startsWith("/") && !href.startsWith("//")) {
          event.preventDefault();
          setPendingHref(href);
          window.setTimeout(() => setPendingHref(null), 5000);
          router.push(href);
        }
      }}
    >
      <span className="p31-btn__label">{children}</span>
      {loading ? <span className="p31-btn__spinner" aria-hidden="true" /> : null}
    </Link>
  );
}

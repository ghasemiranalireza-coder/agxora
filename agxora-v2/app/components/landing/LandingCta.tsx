"use client";

import { useState, type JSX, type ReactNode, type MouseEvent } from "react";
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
 * Hash links scroll in-page; route links show a controlled loading state.
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

  const onClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (loading) {
      event.preventDefault();
      return;
    }

    if (href.startsWith("#")) {
      if (pathname !== "/") return;
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      event.preventDefault();
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
      window.history.replaceState(null, "", href);
      return;
    }

    if (href.startsWith("/") && !href.startsWith("//")) {
      event.preventDefault();
      setPendingHref(href);
      window.setTimeout(() => setPendingHref(null), 5000);
      router.push(href);
    }
  };

  return (
    <Link
      href={href}
      className={classes}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      <span className="p31-btn__label">{children}</span>
      {loading ? <span className="p31-btn__spinner" aria-hidden="true" /> : null}
    </Link>
  );
}

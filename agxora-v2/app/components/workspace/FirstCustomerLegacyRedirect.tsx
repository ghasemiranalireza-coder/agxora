"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Client replace for leftover Day 1 routes that have a real first-customer destination. */
export function FirstCustomerLegacyRedirect({
  href,
}: {
  readonly href: string;
}): null {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return null;
}

"use client";

import type { JSX } from "react";
import { useLocale } from "../../lib/i18n";
import { SkeletonPanel } from "../backend";

/** Locale-aware skeleton for dashboard route dynamic imports. */
export function RouteLoadingPanel({
  messageKey,
}: {
  readonly messageKey: string;
}): JSX.Element {
  const { t } = useLocale();
  return <SkeletonPanel label={t(messageKey)} />;
}

export function createRouteLoading(messageKey: string): () => JSX.Element {
  return function RouteLoading() {
    return <RouteLoadingPanel messageKey={messageKey} />;
  };
}

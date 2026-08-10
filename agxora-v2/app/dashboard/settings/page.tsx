"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { SkeletonPanel } from "../../components/backend";
import { useT } from "../../lib/i18n";

function SettingsLoading(): JSX.Element {
  const t = useT();
  return <SkeletonPanel label={t("settings.page.loading")} />;
}

const Page = dynamic(
  () => import("../../components/settings").then((mod) => mod.SettingsControlCenter),
  {
    ssr: false,
    loading: () => <SettingsLoading />,
  },
);

export default function RoutePage(): JSX.Element {
  return <Page />;
}

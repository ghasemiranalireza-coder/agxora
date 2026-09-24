"use client";

import type { JSX } from "react";
import { FirstCustomerLegacyUnavailable } from "../../components/workspace/FirstCustomerLegacyUnavailable";

export default function CreatorPage(): JSX.Element {
  return (
    <FirstCustomerLegacyUnavailable
      titleKey="dashboard.legacy.creator.title"
      descriptionKey="dashboard.legacy.creator.description"
    />
  );
}

"use client";

import type { JSX } from "react";
import { FirstCustomerLegacyUnavailable } from "../../components/workspace/FirstCustomerLegacyUnavailable";

export default function SocialPage(): JSX.Element {
  return (
    <FirstCustomerLegacyUnavailable
      titleKey="dashboard.legacy.social.title"
      descriptionKey="dashboard.legacy.social.description"
    />
  );
}

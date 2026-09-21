"use client";

import type { JSX } from "react";
import { FirstCustomerLegacyUnavailable } from "../../components/workspace/FirstCustomerLegacyUnavailable";

export default function ProjectsPage(): JSX.Element {
  return (
    <FirstCustomerLegacyUnavailable
      titleKey="dashboard.legacy.projects.title"
      descriptionKey="dashboard.legacy.projects.description"
    />
  );
}

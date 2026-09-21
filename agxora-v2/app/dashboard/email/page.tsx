"use client";

import type { JSX } from "react";
import { FirstCustomerLegacyRedirect } from "../../components/workspace/FirstCustomerLegacyRedirect";
import { firstCustomerLegacyRedirect } from "../../lib/workspace/firstCustomerHardening";

export default function EmailPage(): JSX.Element {
  return (
    <FirstCustomerLegacyRedirect
      href={firstCustomerLegacyRedirect("/dashboard/email")}
    />
  );
}

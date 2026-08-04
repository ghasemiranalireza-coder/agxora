import type { Metadata } from "next";
import type { JSX } from "react";
import { PricingPageView } from "../components/pricing/PricingPageView";

export const metadata: Metadata = {
  title: "Pricing — AGXORA",
  description:
    "AGXORA subscription plans: Starter, Professional, and Enterprise. Start free or contact sales.",
};

export default function PricingPage(): JSX.Element {
  return <PricingPageView />;
}

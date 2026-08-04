import type { Metadata } from "next";
import type { JSX } from "react";
import { PricingPageView } from "../components/pricing/PricingPageView";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "AGXORA subscription plans: Starter, Business, Professional, and Enterprise. Start free or contact sales.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing · AGXORA",
    description:
      "Clear commercial tiers for freelancers, growing teams, and enterprise.",
    url: "/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing · AGXORA",
    description:
      "Clear commercial tiers for freelancers, growing teams, and enterprise.",
  },
};

export default function PricingPage(): JSX.Element {
  return <PricingPageView />;
}

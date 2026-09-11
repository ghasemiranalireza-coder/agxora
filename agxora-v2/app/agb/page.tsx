import type { Metadata } from "next";
import type { JSX } from "react";
import { LegalPlaceholder } from "../components/site/LegalPlaceholder";

export const metadata: Metadata = {
  title: "AGB – AGXORA",
};

export default function AgbPage(): JSX.Element {
  return (
    <LegalPlaceholder
      title="Allgemeine Geschäftsbedingungen"
      description="Diese Seite befindet sich im Aufbau. Hier erscheinen die Allgemeinen Geschäftsbedingungen für die Nutzung von AGXORA."
    />
  );
}

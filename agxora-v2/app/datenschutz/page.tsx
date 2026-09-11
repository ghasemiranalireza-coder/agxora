import type { Metadata } from "next";
import type { JSX } from "react";
import { LegalPlaceholder } from "../components/site/LegalPlaceholder";

export const metadata: Metadata = {
  title: "Datenschutz – AGXORA",
};

export default function DatenschutzPage(): JSX.Element {
  return (
    <LegalPlaceholder
      title="Datenschutz"
      description="Diese Seite befindet sich im Aufbau. Hier erscheint die Datenschutzerklärung zur Verarbeitung personenbezogener Daten."
    />
  );
}

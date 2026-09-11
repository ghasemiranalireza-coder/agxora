import type { Metadata } from "next";
import type { JSX } from "react";
import { LegalPlaceholder } from "../components/site/LegalPlaceholder";

export const metadata: Metadata = {
  title: "Kontakt – AGXORA",
};

export default function KontaktPage(): JSX.Element {
  return (
    <LegalPlaceholder
      title="Kontakt"
      description="Diese Seite befindet sich im Aufbau. Die Kontaktmöglichkeiten werden derzeit eingerichtet."
    />
  );
}

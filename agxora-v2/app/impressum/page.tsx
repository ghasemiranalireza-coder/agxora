import type { Metadata } from "next";
import type { JSX } from "react";
import { LegalPlaceholder } from "../components/site/LegalPlaceholder";

export const metadata: Metadata = {
  title: "Impressum – AGXORA",
};

export default function ImpressumPage(): JSX.Element {
  return (
    <LegalPlaceholder
      title="Impressum"
      description="Diese Seite befindet sich im Aufbau. Hier erscheinen die gesetzlich vorgeschriebenen Anbieterangaben."
    />
  );
}

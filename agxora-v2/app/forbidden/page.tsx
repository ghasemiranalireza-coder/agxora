"use client";

import type { JSX } from "react";
import { AccessState } from "../components/identity";

export default function ForbiddenPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <AccessState code="forbidden" />
    </main>
  );
}

"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";

const Page = dynamic(
  () =>
    import("../../features/auth").then((mod) => mod.AccountLockedPage),
  { ssr: false },
);

export default function RoutePage(): JSX.Element {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <Page />
    </main>
  );
}

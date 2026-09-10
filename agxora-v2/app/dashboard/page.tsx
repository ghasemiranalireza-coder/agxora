import type { Metadata } from "next";
import { DashboardShell } from "../components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard – AGXORA",
};

export default function Dashboard() {
  return <DashboardShell />;
}

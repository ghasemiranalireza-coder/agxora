"use client";

import Link from "next/link";
import {
  AuthCard,
  authButtonStyle,
  authMutedStyle,
} from "../components/auth/AuthCard";

export default function BookDemoPage() {
  return (
    <AuthCard
      title="Book a demo"
      subtitle="Live walkthroughs with the AGXORA team are coming soon. Leave nothing dangling — here’s where the booking calendar will live."
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.18)",
            background: "rgba(15,23,42,0.55)",
            padding: "18px 16px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(125,211,252,0.85)",
            }}
          >
            Coming soon
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 14,
              lineHeight: 1.55,
              color: "rgba(226,232,240,0.92)",
            }}
          >
            We’re finishing scheduling so you can pick a time that works for your team.
            Until then, start free and explore the product at your own pace — or reach us at{" "}
            <a
              href="mailto:hello@agxora.com?subject=AGXORA%20demo%20request"
              style={{ color: "#7dd3fc", fontWeight: 600 }}
            >
              hello@agxora.com
            </a>
            .
          </p>
        </div>

        <Link href="/register" style={{ ...authButtonStyle, textAlign: "center", textDecoration: "none" }}>
          Start free instead
        </Link>

        <p style={{ ...authMutedStyle, textAlign: "center", margin: 0 }}>
          <Link href="/" style={{ color: "#7dd3fc", fontWeight: 600 }}>
            Back to home
          </Link>
          {" · "}
          <Link href="/login" style={{ color: "#7dd3fc", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

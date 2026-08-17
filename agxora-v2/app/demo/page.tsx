"use client";

import Link from "next/link";
import type { JSX } from "react";
import {
  AuthCard,
  authButtonStyle,
  authMutedStyle,
} from "../components/auth/AuthCard";
import { useT } from "../lib/i18n";

export default function BookDemoPage(): JSX.Element {
  const t = useT();

  return (
    <AuthCard
      title={t("backend.demo.title")}
      subtitle={t("backend.demo.subtitle")}
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
            {t("backend.demo.requestTitle")}
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 14,
              lineHeight: 1.55,
              color: "rgba(226,232,240,0.92)",
            }}
          >
            {t("backend.demo.requestBody", { email: "" }).replace("  ", " ")}
            <a
              href="mailto:hello@agxora.app?subject=AGXORA%20demo%20request"
              style={{ color: "#7dd3fc", fontWeight: 600 }}
            >
              hello@agxora.app
            </a>
            .
          </p>
        </div>

        <Link href="/register" style={{ ...authButtonStyle, textAlign: "center", textDecoration: "none" }}>
          {t("backend.demo.startFree")}
        </Link>

        <p style={{ ...authMutedStyle, textAlign: "center", margin: 0 }}>
          <Link href="/" style={{ color: "#7dd3fc", fontWeight: 600 }}>
            {t("backend.demo.backHome")}
          </Link>
          {" · "}
          <Link href="/login" style={{ color: "#7dd3fc", fontWeight: 600 }}>
            {t("backend.demo.signIn")}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

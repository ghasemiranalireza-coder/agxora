"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type JSX } from "react";
import {
  AuthCard,
  authButtonStyle,
  authMutedStyle,
} from "../components/auth/AuthCard";
import { useAuth } from "../lib/auth";
import { completeWelcome } from "../lib/auth/welcomeFlags";
import { useT } from "../lib/i18n";

export default function WelcomePage(): JSX.Element {
  const t = useT();
  const router = useRouter();
  const { user, hydrated, isAuthenticated } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!hydrated || redirected.current) return;
    if (!isAuthenticated || !user) {
      redirected.current = true;
      router.replace("/login?next=/welcome");
    }
  }, [hydrated, isAuthenticated, user, router]);

  const firstName = user?.displayName?.trim().split(/\s+/)[0] || "";

  function onContinue() {
    completeWelcome(user?.id);
    router.replace("/onboarding");
  }

  if (!hydrated || !isAuthenticated || !user) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.12), transparent), #05070d",
          color: "#e8edf7",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        }}
      >
        <p style={{ margin: 0, color: "rgba(148,163,184,0.9)", fontSize: 14 }}>
          {t("common.loading")}
        </p>
      </main>
    );
  }

  return (
    <AuthCard
      title={firstName ? `${t("auth.welcome.title")}, ${firstName}` : t("auth.welcome.title")}
      subtitle={t("auth.welcome.subtitle")}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <ul
          style={{
            margin: 0,
            padding: "0 0 0 18px",
            color: "rgba(203,213,225,0.92)",
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          <li>Confirm your organization profile</li>
          <li>Choose modules that match how you work</li>
          <li>Enter the dashboard with a clear starting point</li>
        </ul>

        <button type="button" onClick={onContinue} style={authButtonStyle}>
          {t("auth.welcome.continue")}
        </button>

        <p style={{ ...authMutedStyle, textAlign: "center", margin: 0 }}>
          Prefer to explore first?{" "}
          <Link
            href="/dashboard"
            onClick={() => completeWelcome(user.id)}
            style={{ color: "#7dd3fc", fontWeight: 600 }}
          >
            Skip to dashboard
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

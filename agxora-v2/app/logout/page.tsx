"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type JSX } from "react";
import { AuthCard } from "../components/auth/AuthCard";
import { IdentityLoadingOverlay } from "../components/identity";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { iamAuthService } from "../../features/auth";

/**
 * /logout — clears the local session and redirects to login.
 */
export default function LogoutPage(): JSX.Element {
  const t = useT();
  const { signOut } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await iamAuthService.logout();
        await signOut();
        if (!cancelled) router.replace("/login");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("backend.logout.failed"));
          router.replace("/login");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, signOut, t]);

  if (error) {
    return <AuthCard title={t("backend.logout.title")}>{error}</AuthCard>;
  }

  return (
    <>
      <AuthCard title={t("backend.logout.title")}>{t("backend.logout.signingOut")}</AuthCard>
      <IdentityLoadingOverlay label={t("backend.logout.endingSession")} />
    </>
  );
}

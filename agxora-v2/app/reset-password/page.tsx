"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type JSX } from "react";
import { useAuth } from "../lib/auth";
import {
  AuthCard,
  AuthLink,
  authButtonStyle,
  authInputStyle,
  authLabelStyle,
} from "../components/auth/AuthCard";
import { useT, resolveUserFacingErrorKey } from "../lib/i18n";

function ResetPasswordForm(): JSX.Element {
  const t = useT();
  const { resetPassword } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await resetPassword({ token, password });
      router.replace("/login");
    } catch (err) {
      setError(resolveUserFacingErrorKey(err, "auth.reset.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.reset.title")}
      subtitle={t("auth.reset.subtitle")}
      footer={<AuthLink href="/login">{t("auth.reset.backToSignIn")}</AuthLink>}
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <label style={authLabelStyle} htmlFor="reset-token">
          {t("auth.reset.token")}
        </label>
        <input
          id="reset-token"
          type="text"
          placeholder={t("auth.reset.token")}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
          style={authInputStyle}
        />
        <label style={authLabelStyle} htmlFor="reset-password">
          {t("auth.reset.newPassword")}
        </label>
        <input
          id="reset-password"
          type="password"
          placeholder={t("auth.reset.newPassword")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          style={authInputStyle}
        />
        {error ? (
          <p style={{ color: "#f87171", fontSize: 13, marginTop: 0 }}>{t(error)}</p>
        ) : null}
        <button type="submit" disabled={busy} style={authButtonStyle}>
          {busy ? t("auth.reset.submitting") : t("auth.reset.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

function ResetFallback(): JSX.Element {
  const t = useT();
  return (
    <AuthCard title={t("auth.reset.loading")}>
      <p style={{ color: "#94a3b8", textAlign: "center" }}>{t("common.loading")}</p>
    </AuthCard>
  );
}

export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type JSX } from "react";
import { useAuth } from "../lib/auth";
import { localizeThrownError, useT } from "../lib/i18n";
import {
  AuthCard,
  AuthLink,
  authButtonStyle,
  authInputStyle,
} from "../components/auth/AuthCard";

function VerifyEmailForm(): JSX.Element {
  const t = useT();
  const { verifyEmail, requestEmailVerification, peekVerifyToken, isAuthenticated } =
    useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const issueToken = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await requestEmailVerification();
      const peeked = peekVerifyToken();
      if (peeked) setToken(peeked);
      setMessage(t("iam.verifyEmail.tokenIssued"));
    } catch (err) {
      setError(localizeThrownError(t, err, "iam.verifyEmail.issueFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyEmail({ token });
      router.replace("/dashboard");
    } catch (err) {
      setError(localizeThrownError(t, err, "iam.verifyEmail.verificationFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("iam.verifyEmail.title")}
      footer={<AuthLink href="/dashboard">{t("iam.verifyEmail.skipForNow")}</AuthLink>}
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <input
          type="text"
          placeholder={t("iam.verifyEmail.tokenPlaceholder")}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
          style={authInputStyle}
        />
        {message ? (
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0 }}>{message}</p>
        ) : null}
        {error ? (
          <p style={{ color: "#f87171", fontSize: 13, marginTop: 0 }}>{error}</p>
        ) : null}
        <button type="submit" disabled={busy} style={authButtonStyle}>
          {busy ? t("iam.verifyEmail.verifying") : t("iam.verifyEmail.verify")}
        </button>
      </form>
      {isAuthenticated ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void issueToken()}
          style={{
            ...authButtonStyle,
            marginTop: 12,
            background: "transparent",
            border: "1px solid rgba(34,211,238,0.35)",
            color: "#22d3ee",
          }}
        >
          {t("iam.verifyEmail.requestToken")}
        </button>
      ) : null}
    </AuthCard>
  );
}

export default function VerifyEmailPage(): JSX.Element {
  const t = useT();
  return (
    <Suspense
      fallback={
        <AuthCard title={t("iam.verifyEmail.title")}>
          <p style={{ color: "#94a3b8", textAlign: "center" }}>
            {t("iam.verifyEmail.loading")}
          </p>
        </AuthCard>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}

"use client";

import { useState, type FormEvent, type JSX } from "react";
import { useAuth } from "../lib/auth";
import {
  AuthCard,
  AuthLink,
  authButtonStyle,
  authInputStyle,
  authLabelStyle,
} from "../components/auth/AuthCard";
import { useT } from "../lib/i18n";

export default function ForgotPasswordPage(): JSX.Element {
  const t = useT();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await forgotPassword({ email });
      setMessage(t("auth.forgot.success"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("auth.forgot.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      footer={<AuthLink href="/login">{t("auth.forgot.backToSignIn")}</AuthLink>}
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <label style={authLabelStyle} htmlFor="forgot-email">
          {t("auth.forgot.email")}
        </label>
        <input
          id="forgot-email"
          type="email"
          placeholder={t("auth.forgot.email")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={authInputStyle}
        />
        {message ? (
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0 }}>{message}</p>
        ) : null}
        <button type="submit" disabled={busy} style={authButtonStyle}>
          {busy ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

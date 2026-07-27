"use client";

import { useState, type FormEvent, type JSX } from "react";
import { useAuth } from "../lib/auth";
import {
  AuthCard,
  AuthLink,
  authButtonStyle,
  authInputStyle,
} from "../components/auth/AuthCard";

export default function ForgotPasswordPage(): JSX.Element {
  const { forgotPassword, peekResetToken } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await forgotPassword({ email });
      const peeked = peekResetToken(email);
      setToken(peeked ?? result.token);
      setMessage(
        "If an account exists, a reset token was issued. Use it on the reset page.",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Forgot Password"
      footer={
        <>
          <AuthLink href="/login">Back to sign in</AuthLink>
          {token ? (
            <div style={{ marginTop: 8 }}>
              <AuthLink href={`/reset-password?token=${encodeURIComponent(token)}`}>
                Continue to reset password
              </AuthLink>
            </div>
          ) : null}
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={authInputStyle}
        />
        {message ? (
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0 }}>{message}</p>
        ) : null}
        <button type="submit" disabled={busy} style={authButtonStyle}>
          {busy ? "Sending…" : "Send Reset Link"}
        </button>
      </form>
    </AuthCard>
  );
}

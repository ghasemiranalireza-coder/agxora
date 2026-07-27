"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type JSX } from "react";
import { useAuth } from "../lib/auth";
import {
  AuthCard,
  AuthLink,
  authButtonStyle,
  authInputStyle,
} from "../components/auth/AuthCard";

function ResetPasswordForm(): JSX.Element {
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
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      footer={<AuthLink href="/login">Back to sign in</AuthLink>}
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <input
          type="text"
          placeholder="Reset token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
          style={authInputStyle}
        />
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          style={authInputStyle}
        />
        {error ? (
          <p style={{ color: "#f87171", fontSize: 13, marginTop: 0 }}>{error}</p>
        ) : null}
        <button type="submit" disabled={busy} style={authButtonStyle}>
          {busy ? "Updating…" : "Update Password"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <AuthCard title="Reset Password">
          <p style={{ color: "#94a3b8", textAlign: "center" }}>Loading…</p>
        </AuthCard>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

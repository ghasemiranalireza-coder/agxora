"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type JSX } from "react";
import { useAuth } from "../lib/auth";
import {
  AuthCard,
  AuthLink,
  authButtonStyle,
  authInputStyle,
} from "../components/auth/AuthCard";

export default function RegisterPage(): JSX.Element {
  const { signUp } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp({ email, password, displayName });
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Sign Up"
      footer={
        <>
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <input
          type="text"
          placeholder="Full name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          autoComplete="name"
          style={authInputStyle}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          style={authInputStyle}
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          style={authInputStyle}
        />
        {error ? (
          <p style={{ color: "#f87171", fontSize: 13, marginTop: 0 }}>{error}</p>
        ) : null}
        <button type="submit" disabled={busy} style={authButtonStyle}>
          {busy ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </AuthCard>
  );
}

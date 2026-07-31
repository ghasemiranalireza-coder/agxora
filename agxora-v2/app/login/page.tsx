"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type JSX } from "react";
import {
  AuthCard,
  AuthCheckbox,
  AuthFieldError,
  AuthLink,
  authButtonDisabledStyle,
  authButtonStyle,
  authInputStyle,
  authLabelStyle,
  authRowStyle,
} from "../components/auth/AuthCard";
import { useAuth } from "../lib/auth";
import { getRememberedEmail, login as identityLogin } from "../lib/identity";

function LoginForm(): JSX.Element {
  const { refresh } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const remembered = getRememberedEmail();
  const [email, setEmail] = useState(remembered ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(remembered));
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = (): boolean => {
    if (!email.trim() || !email.includes("@")) {
      setFieldError("Enter a valid email address.");
      return false;
    }
    if (password.length < 8) {
      setFieldError("Password must be at least 8 characters.");
      return false;
    }
    setFieldError(null);
    return true;
  };

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError(null);
    try {
      await identityLogin({ email, password, rememberMe });
      await refresh();
      const next = search.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Sign In"
      footer={
        <>
          <div>
            No account? <AuthLink href="/register">Create workspace</AuthLink>
          </div>
          <div>
            <AuthLink href="/forgot-password">Forgot Password</AuthLink>
          </div>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <label style={authLabelStyle} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          disabled={busy}
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="login-password">
          Password
        </label>
        <div style={authRowStyle}>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            disabled={busy}
            style={{ ...authInputStyle, marginBottom: 0, paddingRight: 96 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={busy}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              color: "#22d3ee",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showPassword ? "Hide" : "Show Password"}
          </button>
        </div>

        <AuthCheckbox checked={rememberMe} onChange={setRememberMe}>
          Remember Me
        </AuthCheckbox>

        <AuthFieldError message={fieldError ?? error} />

        <button
          type="submit"
          disabled={busy}
          style={busy ? authButtonDisabledStyle : authButtonStyle}
          aria-busy={busy}
        >
          {busy ? "Signing in…" : "Login"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage(): JSX.Element {
  return (
    <Suspense fallback={<AuthCard title="Sign In">Loading…</AuthCard>}>
      <LoginForm />
    </Suspense>
  );
}

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
  authToggleStyle,
} from "../components/auth/AuthCard";
import { useAuth } from "../lib/auth";
import { isValidEmail } from "../lib/auth/formValidation";
import { needsWelcome } from "../lib/auth/welcomeFlags";
import { getRememberedEmail } from "../lib/identity";
import { iamAuthService } from "../../features/auth";

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
    if (!isValidEmail(email)) {
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
      const result = await iamAuthService.login({ email, password, rememberMe });
      await refresh();
      const next = search.get("next");
      if (needsWelcome(result.userId)) {
        router.replace("/welcome");
        return;
      }
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to AGXORA."
      footer={
        <>
          <div>
            No account? <AuthLink href="/register">Start free</AuthLink>
          </div>
          <div>
            <AuthLink href="/forgot-password">Forgot password</AuthLink>
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
          aria-required="true"
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
            aria-required="true"
            style={{ ...authInputStyle, marginBottom: 0, paddingRight: 96 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={busy}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={authToggleStyle}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <AuthCheckbox
          id="login-remember"
          checked={rememberMe}
          onChange={setRememberMe}
        >
          Remember Me
        </AuthCheckbox>

        <AuthFieldError message={fieldError ?? error} />

        <button
          type="submit"
          disabled={busy}
          style={busy ? authButtonDisabledStyle : authButtonStyle}
          aria-busy={busy}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage(): JSX.Element {
  return (
    <Suspense fallback={<AuthCard title="Sign in">Loading…</AuthCard>}>
      <LoginForm />
    </Suspense>
  );
}

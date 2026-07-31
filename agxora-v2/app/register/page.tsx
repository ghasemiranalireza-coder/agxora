"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type JSX } from "react";
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
import { iamAuthService } from "../../features/auth";

export default function RegisterPage(): JSX.Element {
  const { refresh } = useAuth();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = (): string | null => {
    if (!companyName.trim()) return "Company name is required.";
    if (!displayName.trim()) return "Full name is required.";
    if (!email.includes("@")) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!acceptTerms) return "Accept the terms to create a workspace.";
    return null;
  };

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await iamAuthService.register({
        email,
        password,
        displayName,
        companyName,
        acceptTerms,
      });
      await refresh();
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Create Workspace"
      footer={
        <>
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <label style={authLabelStyle} htmlFor="reg-company">
          Company Name
        </label>
        <input
          id="reg-company"
          type="text"
          placeholder="AGXORA GmbH"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          disabled={busy}
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="reg-name">
          Full Name
        </label>
        <input
          id="reg-name"
          type="text"
          placeholder="Alex Morgan"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          autoComplete="name"
          disabled={busy}
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="reg-email">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={busy}
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="reg-password">
          Password
        </label>
        <div style={authRowStyle}>
          <input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={busy}
            style={{ ...authInputStyle, marginBottom: 0, paddingRight: 72 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
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
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <label style={{ ...authLabelStyle, marginTop: 15 }} htmlFor="reg-confirm">
          Confirm Password
        </label>
        <input
          id="reg-confirm"
          type={showPassword ? "text" : "password"}
          placeholder="Repeat password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={busy}
          style={authInputStyle}
        />

        <AuthCheckbox checked={acceptTerms} onChange={setAcceptTerms}>
          Accept Terms — I agree to the AGXORA workspace terms and privacy policy.
        </AuthCheckbox>

        <AuthFieldError message={error} />

        <button
          type="submit"
          disabled={busy}
          style={busy ? authButtonDisabledStyle : authButtonStyle}
          aria-busy={busy}
        >
          {busy ? "Creating workspace…" : "Create Workspace"}
        </button>
      </form>
    </AuthCard>
  );
}

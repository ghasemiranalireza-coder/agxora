"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent, type JSX } from "react";
import {
  AuthCard,
  AuthCheckbox,
  AuthFieldError,
  AuthLink,
  authButtonDisabledStyle,
  authButtonStyle,
  authHintStyle,
  authInputStyle,
  authLabelStyle,
  authRowStyle,
  authToggleStyle,
} from "../components/auth/AuthCard";
import { useAuth } from "../lib/auth";
import {
  assessPasswordStrength,
  isValidEmail,
  passwordStrengthMessage,
} from "../lib/auth/formValidation";
import { markWelcomePending } from "../lib/auth/welcomeFlags";
import { iamAuthService } from "../../features/auth";

export default function RegisterPage(): JSX.Element {
  const { refresh } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = assessPasswordStrength(password);

  const validate = (): string | null => {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!companyName.trim()) return "Company is required.";
    if (!isValidEmail(email)) return "Enter a valid email address.";
    const passwordError = passwordStrengthMessage(password);
    if (passwordError) return passwordError;
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!acceptTerms) return "Accept the terms to continue.";
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
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const result = await iamAuthService.register({
        email: email.trim(),
        password,
        displayName,
        companyName: companyName.trim(),
        acceptTerms,
      });
      markWelcomePending(result.userId);
      await refresh();
      router.replace("/welcome");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start free — set up your AGXORA workspace."
      footer={
        <>
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <div
          className="auth-name-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <label style={authLabelStyle} htmlFor="reg-first">
              First Name
            </label>
            <input
              id="reg-first"
              type="text"
              placeholder="Alex"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              disabled={busy}
              aria-required="true"
              style={{ ...authInputStyle, marginBottom: 15 }}
            />
          </div>
          <div>
            <label style={authLabelStyle} htmlFor="reg-last">
              Last Name
            </label>
            <input
              id="reg-last"
              type="text"
              placeholder="Morgan"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              disabled={busy}
              aria-required="true"
              style={{ ...authInputStyle, marginBottom: 15 }}
            />
          </div>
        </div>

        <label style={authLabelStyle} htmlFor="reg-company">
          Company
        </label>
        <input
          id="reg-company"
          type="text"
          placeholder="AGXORA GmbH"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          autoComplete="organization"
          disabled={busy}
          aria-required="true"
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
          aria-required="true"
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="reg-password">
          Password
        </label>
        <div style={authRowStyle}>
          <input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 characters, letters + numbers"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={busy}
            aria-required="true"
            aria-describedby="reg-password-hint"
            style={{ ...authInputStyle, marginBottom: 0, paddingRight: 72 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={authToggleStyle}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <p id="reg-password-hint" style={authHintStyle}>
          Strength:{" "}
          <span style={{ color: strength === "strong" ? "#34d399" : strength === "fair" ? "#fbbf24" : "#f87171" }}>
            {strength}
          </span>
        </p>

        <label style={authLabelStyle} htmlFor="reg-confirm">
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
          aria-required="true"
          style={authInputStyle}
        />

        <AuthCheckbox
          id="reg-terms"
          checked={acceptTerms}
          onChange={setAcceptTerms}
        >
          Accept Terms — I agree to the AGXORA{" "}
          <Link href="/terms" style={{ color: "#22d3ee" }}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" style={{ color: "#22d3ee" }}>
            Privacy Policy
          </Link>
          .
        </AuthCheckbox>

        <AuthFieldError message={error} />

        <button
          type="submit"
          disabled={busy}
          style={busy ? authButtonDisabledStyle : authButtonStyle}
          aria-busy={busy}
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <style>{`
        @media (max-width: 520px) {
          .auth-name-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AuthCard>
  );
}

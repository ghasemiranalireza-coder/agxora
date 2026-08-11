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
import { useT } from "../lib/i18n";
import { iamAuthService } from "../../features/auth";

export default function RegisterPage(): JSX.Element {
  const t = useT();
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
  const strengthLabel =
    strength === "strong"
      ? t("auth.register.strengthStrong")
      : strength === "fair"
        ? t("auth.register.strengthFair")
        : t("auth.register.strengthWeak");

  const validate = (): string | null => {
    if (!firstName.trim()) return "errors.required";
    if (!lastName.trim()) return "errors.required";
    if (!companyName.trim()) return "errors.required";
    if (!isValidEmail(email)) return "errors.invalidEmail";
    const passwordError = passwordStrengthMessage(password);
    if (passwordError) return passwordError;
    if (password !== confirmPassword) return "errors.passwordMismatch";
    if (!acceptTerms) return "errors.acceptTerms";
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
      setError(err instanceof Error ? err.message : "auth.register.failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footer={
        <>
          {t("auth.register.haveAccount")}{" "}
          <AuthLink href="/login">{t("auth.register.signIn")}</AuthLink>
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
              {t("auth.register.firstName")}
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
              {t("auth.register.lastName")}
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
          {t("auth.register.company")}
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
          {t("auth.register.email")}
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
          {t("auth.register.password")}
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
            aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
            style={authToggleStyle}
          >
            {showPassword ? t("common.hidePassword") : t("common.showPassword")}
          </button>
        </div>
        <p id="reg-password-hint" style={authHintStyle}>
          {t("auth.register.strength")}:{" "}
          <span style={{ color: strength === "strong" ? "#34d399" : strength === "fair" ? "#fbbf24" : "#f87171" }}>
            {strengthLabel}
          </span>
        </p>

        <label style={authLabelStyle} htmlFor="reg-confirm">
          {t("auth.register.confirmPassword")}
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
          {t("auth.register.acceptTerms")}{" "}
          <Link href="/terms" style={{ color: "#22d3ee" }}>
            {t("auth.register.termsOfService")}
          </Link>{" "}
          {t("auth.register.and")}{" "}
          <Link href="/privacy" style={{ color: "#22d3ee" }}>
            {t("auth.register.privacyPolicy")}
          </Link>
        </AuthCheckbox>

        <AuthFieldError message={error ? t(error) : null} />

        <button
          type="submit"
          disabled={busy}
          style={busy ? authButtonDisabledStyle : authButtonStyle}
          aria-busy={busy}
        >
          {busy ? t("auth.register.submitting") : t("auth.register.submit")}
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

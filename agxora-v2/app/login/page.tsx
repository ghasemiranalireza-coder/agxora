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
import { useT, resolveUserFacingErrorKey } from "../lib/i18n";
import { iamAuthService } from "../../features/auth";

function LoginForm(): JSX.Element {
  const t = useT();
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
      setFieldError("errors.invalidEmail");
      return false;
    }
    if (password.length < 8) {
      setFieldError("errors.passwordMin");
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
      if (next && next.startsWith("/invite/")) {
        router.replace(next);
        return;
      }
      if (needsWelcome(result.userId)) {
        router.replace("/welcome");
        return;
      }
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(resolveUserFacingErrorKey(err, "auth.login.failed"));
    } finally {
      setBusy(false);
    }
  };

  const displayError = fieldError ? t(fieldError) : error ? t(error) : null;

  return (
    <AuthCard
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          <div>
            {t("auth.login.noAccount")}{" "}
            <AuthLink
              href={
                search.get("next")?.startsWith("/")
                  ? `/register?next=${encodeURIComponent(search.get("next") ?? "")}`
                  : "/register"
              }
            >
              {t("auth.login.startFree")}
            </AuthLink>
          </div>
          <div>
            <AuthLink href="/forgot-password">{t("auth.login.forgotPassword")}</AuthLink>
          </div>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <label style={authLabelStyle} htmlFor="login-email">
          {t("auth.login.email")}
        </label>
        <input
          id="login-email"
          type="email"
          placeholder={t("auth.login.emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          disabled={busy}
          aria-required="true"
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="login-password">
          {t("auth.login.password")}
        </label>
        <div style={authRowStyle}>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.login.passwordPlaceholder")}
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
            aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
            style={authToggleStyle}
          >
            {showPassword ? t("common.hidePassword") : t("common.showPassword")}
          </button>
        </div>

        <AuthCheckbox
          id="login-remember"
          checked={rememberMe}
          onChange={setRememberMe}
        >
          {t("auth.login.rememberMe")}
        </AuthCheckbox>

        <AuthFieldError message={displayError} />

        <button
          type="submit"
          disabled={busy}
          style={busy ? authButtonDisabledStyle : authButtonStyle}
          aria-busy={busy}
        >
          {busy ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

function LoginFallback(): JSX.Element {
  const t = useT();
  return <AuthCard title={t("auth.login.loading")}>{t("common.loading")}</AuthCard>;
}

export default function LoginPage(): JSX.Element {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

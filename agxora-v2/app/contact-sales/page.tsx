"use client";

import Link from "next/link";
import { useState, type FormEvent, type JSX } from "react";
import {
  AuthCard,
  AuthFieldError,
  AuthLink,
  authButtonDisabledStyle,
  authButtonStyle,
  authInputStyle,
  authLabelStyle,
  authMutedStyle,
} from "../components/auth/AuthCard";
import { isValidEmail } from "../lib/auth/formValidation";
import { useT, resolveUserFacingErrorKey } from "../lib/i18n";
import { submitSalesInquiry } from "../../features/saas";

export default function ContactSalesPage(): JSX.Element {
  const t = useT();
  const [company, setCompany] = useState("");
  const [employees, setEmployees] = useState("");
  const [country, setCountry] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const validate = (): string | null => {
    if (!company.trim()) return "errors.required";
    if (!employees.trim()) return "errors.required";
    if (!country.trim()) return "errors.required";
    if (!isValidEmail(businessEmail)) return "errors.invalidEmail";
    if (!message.trim() || message.trim().length < 12) {
      return "errors.required";
    }
    return null;
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      submitSalesInquiry({
        company,
        employees,
        country,
        businessEmail,
        message,
      });
      setSubmitted(true);
    } catch (err) {
      setError(resolveUserFacingErrorKey(err, "auth.contactSales.failed"));
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <AuthCard
        title={t("auth.contactSales.successTitle")}
        subtitle={t("auth.contactSales.successBody")}
        footer={
          <>
            <AuthLink href="/pricing">{t("auth.contactSales.viewPricing")}</AuthLink>
            {" · "}
            <AuthLink href="/demo">{t("auth.contactSales.bookDemo")}</AuthLink>
            {" · "}
            <AuthLink href="/register">{t("auth.login.startFree")}</AuthLink>
          </>
        }
      >
        <p style={{ ...authMutedStyle, margin: "0 0 12px", textAlign: "center" }}>
          {t("auth.contactSales.savedFor", { company })}
        </p>
        <p style={{ ...authMutedStyle, margin: "0 0 18px", textAlign: "center" }}>
          {t("auth.contactSales.preferWalkthrough")}
        </p>
        <Link href="/demo" style={{ ...authButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}>
          {t("auth.contactSales.bookDemo")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.contactSales.title")}
      subtitle={t("auth.contactSales.subtitle")}
      footer={
        <>
          {t("auth.contactSales.preferSelfServe")} <AuthLink href="/register">{t("auth.login.startFree")}</AuthLink>
          {" · "}
          <AuthLink href="/pricing">{t("auth.contactSales.viewPricing")}</AuthLink>
          {" · "}
          <AuthLink href="/demo">{t("auth.contactSales.bookDemo")}</AuthLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <label style={authLabelStyle} htmlFor="sales-company">
          {t("auth.contactSales.company")}
        </label>
        <input
          id="sales-company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
          autoComplete="organization"
          disabled={busy}
          aria-required="true"
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="sales-employees">
          {t("auth.contactSales.employees")}
        </label>
        <select
          id="sales-employees"
          value={employees}
          onChange={(e) => setEmployees(e.target.value)}
          required
          disabled={busy}
          aria-required="true"
          aria-label={t("auth.contactSales.employees")}
          style={authInputStyle}
        >
          <option value="">{t("auth.contactSales.employeesSelect")}</option>
          <option value="1-10">{t("auth.contactSales.employees1_10")}</option>
          <option value="11-50">{t("auth.contactSales.employees11_50")}</option>
          <option value="51-200">{t("auth.contactSales.employees51_200")}</option>
          <option value="201-1000">{t("auth.contactSales.employees201_1000")}</option>
          <option value="1000+">{t("auth.contactSales.employees1000plus")}</option>
        </select>

        <label style={authLabelStyle} htmlFor="sales-country">
          {t("auth.contactSales.country")}
        </label>
        <input
          id="sales-country"
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
          autoComplete="country-name"
          disabled={busy}
          aria-required="true"
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="sales-email">
          {t("auth.contactSales.email")}
        </label>
        <input
          id="sales-email"
          type="email"
          value={businessEmail}
          onChange={(e) => setBusinessEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={busy}
          aria-required="true"
          style={authInputStyle}
        />

        <label style={authLabelStyle} htmlFor="sales-message">
          {t("auth.contactSales.message")}
        </label>
        <textarea
          id="sales-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          disabled={busy}
          aria-required="true"
          placeholder={t("auth.contactSales.messagePlaceholder")}
          style={{
            ...authInputStyle,
            minHeight: 110,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        <AuthFieldError message={error ? t(error) : null} />

        <button
          type="submit"
          disabled={busy}
          style={busy ? authButtonDisabledStyle : authButtonStyle}
          aria-busy={busy}
        >
          {busy ? t("auth.contactSales.submitting") : t("auth.contactSales.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

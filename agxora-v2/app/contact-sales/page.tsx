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
import { submitSalesInquiry } from "../../features/saas";

export default function ContactSalesPage(): JSX.Element {
  const [company, setCompany] = useState("");
  const [employees, setEmployees] = useState("");
  const [country, setCountry] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const validate = (): string | null => {
    if (!company.trim()) return "Company is required.";
    if (!employees.trim()) return "Employees is required.";
    if (!country.trim()) return "Country is required.";
    if (!isValidEmail(businessEmail)) return "Enter a valid business email.";
    if (!message.trim() || message.trim().length < 12) {
      return "Please share a short message about your needs.";
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
      setError(err instanceof Error ? err.message : "Could not submit inquiry.");
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <AuthCard
        title="Thank you"
        subtitle="Our enterprise team will follow up shortly."
        footer={
          <>
            <AuthLink href="/pricing">Back to pricing</AuthLink>
            {" · "}
            <AuthLink href="/demo">Book Demo</AuthLink>
            {" · "}
            <AuthLink href="/register">Start Free</AuthLink>
          </>
        }
      >
        <p style={{ ...authMutedStyle, margin: "0 0 18px", textAlign: "center" }}>
          We received your inquiry for <strong style={{ color: "#e2e8f0" }}>{company}</strong>.
          Prefer a live walkthrough while you wait?
        </p>
        <Link href="/demo" style={{ ...authButtonStyle, display: "block", textAlign: "center", textDecoration: "none" }}>
          Book Demo
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Contact Sales"
      subtitle="Enterprise inquiry — tell us about your organization and we’ll tailor AGXORA."
      footer={
        <>
          Prefer self-serve? <AuthLink href="/register">Start Free</AuthLink>
          {" · "}
          <AuthLink href="/pricing">View pricing</AuthLink>
          {" · "}
          <AuthLink href="/demo">Book Demo</AuthLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <label style={authLabelStyle} htmlFor="sales-company">
          Company
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
          Employees
        </label>
        <select
          id="sales-employees"
          value={employees}
          onChange={(e) => setEmployees(e.target.value)}
          required
          disabled={busy}
          aria-required="true"
          aria-label="Number of employees"
          style={authInputStyle}
        >
          <option value="">Select range</option>
          <option value="1-10">1–10</option>
          <option value="11-50">11–50</option>
          <option value="51-200">51–200</option>
          <option value="201-1000">201–1,000</option>
          <option value="1000+">1,000+</option>
        </select>

        <label style={authLabelStyle} htmlFor="sales-country">
          Country
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
          Business Email
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
          Message
        </label>
        <textarea
          id="sales-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          disabled={busy}
          aria-required="true"
          style={{
            ...authInputStyle,
            minHeight: 110,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        <AuthFieldError message={error} />

        <button
          type="submit"
          disabled={busy}
          style={busy ? authButtonDisabledStyle : authButtonStyle}
          aria-busy={busy}
        >
          {busy ? "Sending…" : "Submit inquiry"}
        </button>
      </form>
    </AuthCard>
  );
}

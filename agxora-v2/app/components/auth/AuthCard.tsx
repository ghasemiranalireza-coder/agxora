"use client";

/**
 * Shared auth card chrome — AGXORA design language (aligned with UI tokens).
 */

import Link from "next/link";
import type { CSSProperties, JSX, ReactNode } from "react";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "var(--agx-sky-gradient, linear-gradient(160deg,#05070c 0%,#0b1220 48%,#0a1628 100%))",
  padding: "24px",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "440px",
  background: "var(--agx-ds-elevated, rgba(12,18,32,0.98))",
  border: "1px solid var(--agx-ds-border, rgba(125,211,252,0.18))",
  borderRadius: "24px",
  padding: "40px 32px",
  boxShadow: "var(--agx-ds-shadow-lg, 0 24px 56px rgba(0,0,0,0.34))",
};

/** Matches `.agx-ui-control` height / radius / colors. */
export const authInputStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "0 16px",
  marginBottom: 16,
  borderRadius: 12,
  border: "1px solid var(--agx-ds-border, rgba(255,255,255,0.1))",
  background: "var(--agx-ds-surface, rgba(255,255,255,0.035))",
  color: "var(--agx-ds-text, #f4f8fb)",
  boxSizing: "border-box",
  outline: "none",
  fontSize: 13,
  fontFamily: "var(--agx-ds-font-ui, var(--font-geist-sans), system-ui, sans-serif)",
  transition:
    "border-color var(--agx-ds-duration, 160ms) var(--agx-ds-ease), box-shadow var(--agx-ds-duration, 160ms) var(--agx-ds-ease)",
};

export const authButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "0 16px",
  borderRadius: 12,
  border: "none",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--agx-ds-accent, #22d3ee) 88%, white) 0%, var(--agx-ds-accent, #22d3ee) 55%, color-mix(in srgb, var(--agx-ds-accent, #22d3ee) 75%, #0e7490) 100%)",
  color: "var(--agx-ds-on-accent, #041018)",
  fontWeight: 650,
  letterSpacing: "0.01em",
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "var(--agx-ds-shadow-sm, 0 4px 14px rgba(0,0,0,0.16))",
  transition: "opacity var(--agx-ds-duration, 160ms) var(--agx-ds-ease)",
};

export const authButtonDisabledStyle: CSSProperties = {
  ...authButtonStyle,
  opacity: 0.55,
  cursor: "not-allowed",
};

export const authLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--agx-ds-text-muted, #94a3b8)",
};

export const authRowStyle: CSSProperties = {
  position: "relative",
  marginBottom: 8,
};

export const authToggleStyle: CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "transparent",
  color: "var(--agx-ds-accent, #22d3ee)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

export const authHintStyle: CSSProperties = {
  margin: "0 0 16px",
  fontSize: 12,
  color: "var(--agx-ds-text-muted, #94a3b8)",
};

export const authMutedStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--agx-ds-text-muted, #94a3b8)",
  lineHeight: 1.5,
};

export function AuthFieldError({
  message,
}: {
  readonly message: string | null;
}): JSX.Element | null {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="agx-ui-error"
      style={{ margin: "0 0 16px" }}
    >
      {message}
    </p>
  );
}

export function AuthCheckbox({
  id,
  checked,
  onChange,
  children,
}: {
  readonly id?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: ReactNode;
}): JSX.Element {
  const inputId = id ?? "auth-checkbox";
  return (
    <label
      htmlFor={inputId}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 16,
        color: "var(--agx-ds-text, #f4f8fb)",
        fontSize: 13,
        lineHeight: 1.45,
        cursor: "pointer",
      }}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3 }}
      />
      <span>{children}</span>
    </label>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}): JSX.Element {
  return (
    <main style={pageStyle} className="agx-auth-page">
      <div style={cardStyle} data-auth-card="">
        <p
          className="agx-ui-section-title"
          style={{
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: "0.28em",
          }}
        >
          AGXORA
        </p>
        <h1
          style={{
            textAlign: "center",
            color: "var(--agx-ds-text, #f4f8fb)",
            marginBottom: subtitle ? 8 : 24,
            marginTop: 0,
            fontSize: 24,
            fontWeight: 650,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--agx-ds-text-muted, #94a3b8)",
              margin: "0 0 24px",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        ) : null}
        {children}
        {footer ? (
          <div
            style={{
              marginTop: 16,
              textAlign: "center",
              color: "var(--agx-ds-text-muted, #94a3b8)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
      <style>{`
        .agx-auth-page input:focus-visible,
        .agx-auth-page button:focus-visible,
        .agx-auth-page a:focus-visible {
          outline: none !important;
          box-shadow: var(--agx-ds-shadow-focus) !important;
          border-color: color-mix(in srgb, var(--agx-ds-accent, #22d3ee) 55%, transparent);
        }
        .agx-auth-page input::placeholder {
          color: var(--agx-ds-placeholder);
        }
        @media (max-width: 520px) {
          .agx-auth-page [data-auth-card] {
            padding: 32px 24px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>
    </main>
  );
}

export function AuthLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <Link
      href={href}
      style={{
        color: "var(--agx-ds-accent, #22d3ee)",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

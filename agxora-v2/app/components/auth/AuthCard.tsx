"use client";

/**
 * Shared auth card chrome — AGXORA design language.
 */

import Link from "next/link";
import type { CSSProperties, JSX, ReactNode } from "react";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(160deg,#05070c 0%,#0b1220 48%,#0a1628 100%)",
  padding: "24px",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "440px",
  background: "rgba(8,14,28,0.88)",
  border: "1px solid rgba(125,211,252,0.18)",
  borderRadius: "24px",
  padding: "40px 36px",
  backdropFilter: "blur(20px)",
  boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
};

export const authInputStyle: CSSProperties = {
  width: "100%",
  padding: "14px",
  marginBottom: "15px",
  borderRadius: "12px",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  boxSizing: "border-box",
  outline: "none",
};

export const authButtonStyle: CSSProperties = {
  width: "100%",
  padding: "15px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(90deg,#06b6d4,#22d3ee)",
  color: "#020617",
  fontWeight: 700,
  letterSpacing: "0.04em",
  cursor: "pointer",
};

export const authButtonDisabledStyle: CSSProperties = {
  ...authButtonStyle,
  opacity: 0.55,
  cursor: "not-allowed",
};

export const authLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: "#94a3b8",
};

export const authRowStyle: CSSProperties = {
  position: "relative",
  marginBottom: 8,
};

export const authToggleStyle: CSSProperties = {
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
};

export const authHintStyle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 12,
  color: "#64748b",
};

export const authMutedStyle: CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
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
      style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px" }}
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
        gap: 10,
        marginBottom: 14,
        color: "#cbd5e1",
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
    <main style={pageStyle}>
      <div style={cardStyle}>
        <p
          style={{
            textAlign: "center",
            color: "#7dd3fc",
            margin: "0 0 8px",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.28em",
          }}
        >
          AGXORA
        </p>
        <h1
          style={{
            textAlign: "center",
            color: "white",
            marginBottom: subtitle ? 10 : 24,
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
              color: "#94a3b8",
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
              marginTop: 18,
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
      <style>{`
        main input:focus-visible,
        main button:focus-visible,
        main a:focus-visible {
          outline: 2px solid #22d3ee !important;
          outline-offset: 2px;
        }
        @media (max-width: 520px) {
          main > div {
            padding: 28px 20px !important;
            border-radius: 20px !important;
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
    <Link href={href} style={{ color: "#22d3ee", textDecoration: "none" }}>
      {children}
    </Link>
  );
}

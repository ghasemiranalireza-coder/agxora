"use client";

/**
 * Shared auth card chrome — matches existing login aesthetic.
 */

import Link from "next/link";
import type { CSSProperties, JSX, ReactNode } from "react";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg,#020617,#0f172a,#111827)",
  padding: "20px",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  background: "rgba(10,20,50,0.8)",
  border: "1px solid rgba(34,211,238,0.3)",
  borderRadius: "24px",
  padding: "40px",
  backdropFilter: "blur(20px)",
  boxShadow: "0 0 30px rgba(34,211,238,0.2)",
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
  marginBottom: 15,
};

export function AuthFieldError({ message }: { readonly message: string | null }): JSX.Element | null {
  if (!message) return null;
  return <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px" }}>{message}</p>;
}

export function AuthCheckbox({
  checked,
  onChange,
  children,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <label
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
  children,
  footer,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}): JSX.Element {
  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1
          style={{
            textAlign: "center",
            color: "#22d3ee",
            marginBottom: "24px",
            marginTop: 0,
            fontSize: "42px",
            letterSpacing: "4px",
          }}
        >
          AGXORA
        </h1>
        <h2
          style={{
            textAlign: "center",
            color: "white",
            marginBottom: "25px",
            marginTop: 0,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          {title}
        </h2>
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

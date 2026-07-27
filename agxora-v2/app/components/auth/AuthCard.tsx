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

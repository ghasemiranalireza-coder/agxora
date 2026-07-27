"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type CSSProperties, type JSX } from "react";
import { useAuth } from "../lib/auth";
import { useOrganization } from "../lib/organization";
import type { WorkspaceId } from "../lib/organization/types";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";

/**
 * Top navigation — org/workspace switchers, breadcrumbs, session actions.
 * Uses existing theme tokens only (no redesign).
 */
export function DashboardTopNav(): JSX.Element {
  const { tokens } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isAuthenticated } = useAuth();
  const { organization, workspace, session, switchWorkspace } =
    useOrganization();

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, index) => ({
      label: part.replace(/-/g, " "),
      href: `/${parts.slice(0, index + 1).join("/")}`,
    }));
  }, [pathname]);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 18,
        paddingBottom: 14,
        borderBottom: `1px solid ${tokens.divider}`,
        transition: `border-color ${THEME_TRANSITION_MS}ms ease`,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 8 }}>
          {crumbs.map((crumb, index) => (
            <span
              key={crumb.href}
              style={{ fontSize: 12, color: tokens.textMuted }}
            >
              {index > 0 ? " / " : null}
              <Link
                href={crumb.href}
                style={{
                  color:
                    index === crumbs.length - 1
                      ? tokens.accent
                      : tokens.textMuted,
                  textDecoration: "none",
                  textTransform: "capitalize",
                }}
              >
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            aria-label="Organization switcher"
            value={organization?.id ?? ""}
            onChange={() => undefined}
            style={selectStyle(tokens)}
          >
            <option value={organization?.id ?? ""}>
              {organization?.name ?? "Organization"}
            </option>
          </select>

          <select
            aria-label="Workspace switcher"
            value={workspace?.id ?? ""}
            onChange={(event) => {
              if (event.target.value) {
                void switchWorkspace(event.target.value as WorkspaceId);
              }
            }}
            style={selectStyle(tokens)}
          >
            {(session.accessibleWorkspaces.length
              ? session.accessibleWorkspaces
              : workspace
                ? [workspace]
                : []
            ).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          aria-label="Open command palette"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("agxora:command-palette"));
          }}
          style={{
            border: `1px solid ${tokens.panelBorder}`,
            background: tokens.inputBg,
            color: tokens.textMuted,
            borderRadius: 12,
            padding: "8px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ⌘K
        </button>
        <span style={{ color: tokens.textMuted, fontSize: 12 }}>
          {user?.displayName ?? (isAuthenticated ? "User" : "Guest")}
        </span>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => router.push("/login"));
            }}
            style={{
              border: `1px solid ${tokens.panelBorder}`,
              background: "transparent",
              color: tokens.textMuted,
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              color: tokens.accent,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function selectStyle(tokens: {
  inputBorder: string;
  inputBg: string;
  text: string;
}): CSSProperties {
  return {
    maxWidth: 180,
    padding: "8px 10px",
    borderRadius: 12,
    border: `1px solid ${tokens.inputBorder}`,
    background: tokens.inputBg,
    color: tokens.text,
    fontSize: 12,
  };
}

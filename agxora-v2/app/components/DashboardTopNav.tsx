"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { useAuth } from "../lib/auth";
import { useOrganization } from "../lib/organization";
import type { WorkspaceId } from "../lib/organization/types";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";
import { ThemeQuickToggle } from "./ThemeQuickToggle";
import { IconButton } from "./ui";

function SvgIcon({ d }: { readonly d: string }): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Top header — Organization · Search · Notifications · Profile · Theme quick toggle.
 * Full Appearance configuration lives in Settings Control Center only.
 * Does not touch Hero Theme Switcher on /dashboard.
 */
export function DashboardTopNav(): JSX.Element {
  const { tokens } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { organization, workspace, session, switchWorkspace } = useOrganization();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const showHeaderTheme = pathname !== "/dashboard";

  useEffect(() => {
    const onDoc = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const orgLabel = organization?.name ?? "Organization";
  const workspaceLabel = workspace?.name ?? "Workspace";
  const displayName = user?.displayName ?? (isAuthenticated ? "User" : "Guest");
  const workspaces =
    session.accessibleWorkspaces.length > 0
      ? session.accessibleWorkspaces
      : workspace
        ? [workspace]
        : [];

  return (
    <header
      className="agx-topnav"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        minHeight: 48,
        marginBottom: 20,
        padding: "4px 0 16px",
        borderBottom: `1px solid ${tokens.divider}`,
        transition: `border-color ${THEME_TRANSITION_MS}ms ease`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
        <div
          aria-label="Current organization"
          title={orgLabel}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minHeight: 36,
            maxWidth: "100%",
            padding: "0 12px",
            borderRadius: 12,
            border: `1px solid ${tokens.inputBorder}`,
            background: tokens.inputBg,
            color: tokens.text,
            fontSize: 13,
            fontWeight: 550,
            letterSpacing: "0.01em",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              width: 8,
              height: 8,
              borderRadius: 999,
              background: tokens.accent,
              boxShadow: `0 0 10px ${tokens.accent}`,
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {orgLabel}
          </span>
        </div>

        {workspaces.length > 0 ? (
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 36,
              padding: "0 10px",
              borderRadius: 12,
              border: `1px solid ${tokens.inputBorder}`,
              background: tokens.inputBg,
              color: tokens.textMuted,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <span className="hidden sm:inline">Workspace</span>
            <select
              aria-label="Workspace switcher"
              value={workspace?.id ?? ""}
              onChange={(event) => {
                if (event.target.value) {
                  void switchWorkspace(event.target.value as WorkspaceId);
                }
              }}
              style={{
                border: "none",
                background: "transparent",
                color: tokens.text,
                fontSize: 13,
                fontWeight: 550,
                maxWidth: 160,
                outline: "none",
                cursor: "pointer",
                textTransform: "none",
                letterSpacing: "normal",
              }}
            >
              {workspaces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span
            style={{
              fontSize: 12,
              color: tokens.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {workspaceLabel}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <IconButton
          label="Search"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("agxora:command-palette"));
          }}
        >
          <SvgIcon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3" />
        </IconButton>

        <div ref={notifRef} style={{ position: "relative" }}>
          <IconButton
            label="Notifications"
            active={notifOpen}
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
          >
            <SvgIcon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />
          </IconButton>
          {notifOpen ? (
            <HeaderMenu width={300}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--agx-text, #f8fafc)",
                }}
              >
                No notifications
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "var(--agx-text-muted, #94a3b8)",
                }}
              >
                You’re all caught up. Alerts and mentions will appear here.
              </p>
            </HeaderMenu>
          ) : null}
        </div>

        <div ref={profileRef} style={{ position: "relative" }}>
          <IconButton
            label="Profile"
            active={profileOpen}
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
          >
            <SvgIcon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
          </IconButton>
          {profileOpen ? (
            <HeaderMenu width={260}>
              <div style={{ padding: "4px 4px 10px" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: tokens.text,
                  }}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: tokens.textMuted,
                  }}
                >
                  {user?.email ?? (isAuthenticated ? "Signed in" : "Guest session")}
                </p>
              </div>

              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 11,
                  color: tokens.textMuted,
                }}
              >
                Role ·{" "}
                {session.memberships.find((m) => m.userId === user?.id)?.role ??
                  (isAuthenticated ? "member" : "guest")}
              </p>

              <Link
                href="/dashboard/settings#profile"
                onClick={() => setProfileOpen(false)}
                style={{
                  display: "block",
                  color: tokens.text,
                  fontSize: 12,
                  textDecoration: "none",
                  padding: "8px 4px",
                }}
              >
                Account settings
              </Link>
              <Link
                href="/dashboard/settings#security"
                onClick={() => setProfileOpen(false)}
                style={{
                  display: "block",
                  color: tokens.text,
                  fontSize: 12,
                  textDecoration: "none",
                  padding: "8px 4px",
                }}
              >
                Security
              </Link>
              <Link
                href="/dashboard/team"
                onClick={() => setProfileOpen(false)}
                style={{
                  display: "block",
                  color: tokens.text,
                  fontSize: 12,
                  textDecoration: "none",
                  padding: "8px 4px",
                  marginBottom: 8,
                }}
              >
                Team
              </Link>

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/logout");
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: `1px solid ${tokens.panelBorder}`,
                    background: "transparent",
                    color: tokens.textMuted,
                    borderRadius: 10,
                    padding: "9px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: "block",
                    color: tokens.accent,
                    fontSize: 12,
                    textDecoration: "none",
                    padding: "8px 4px",
                  }}
                >
                  Sign in
                </Link>
              )}
            </HeaderMenu>
          ) : null}
        </div>

        {showHeaderTheme ? (
          <div className="agx-topnav-theme" style={{ marginLeft: 4 }}>
            <ThemeQuickToggle />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function HeaderMenu({
  children,
  width,
}: {
  readonly children: ReactNode;
  readonly width: number;
}): JSX.Element {
  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        zIndex: 50,
        width,
        maxWidth: "min(92vw, 360px)",
        padding: 12,
        borderRadius: 16,
        border: "1px solid var(--agx-card-border, rgba(255,255,255,0.12))",
        background:
          "linear-gradient(165deg, var(--agx-card-bg-from, rgba(18,24,38,0.96)), var(--agx-card-bg-to, rgba(10,14,24,0.96)))",
        boxShadow: "var(--agx-card-shadow, 0 16px 40px rgba(0,0,0,0.35))",
        backdropFilter: "var(--agx-card-blur, blur(22px) saturate(150%))",
      }}
    >
      {children}
    </div>
  );
}

"use client";

import type { JSX } from "react";
import AgxoraGlobe3D from "../components/AgxoraGlobe3D";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { BusinessOverview } from "../components/dashboard/BusinessOverview";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `text-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `backdrop-filter ${THEME_TRANSITION_MS}ms ease`,
].join(", ");

function NavIcon({
  path,
}: {
  readonly path: string;
}): JSX.Element {
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
      <path d={path} />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "M3 12l9-9 9 9 M5 10v9a1 1 0 0 0 1 1h3m6 0h3a1 1 0 0 0 1-1v-9 M9 20v-6h6v6",
    active: true,
  },
  {
    label: "Analytics",
    path: "M4 19V5 M10 19V9 M16 19v-6 M22 19V7",
    active: false,
  },
  {
    label: "AI Reports",
    path: "M12 3a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-.5 M8 8V7a4 4 0 0 1 4-4 M7 14h.5A3 3 0 0 1 7 8h1m4 12v-3m-4 3h8",
    active: false,
  },
  {
    label: "Customers",
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    active: false,
  },
  {
    label: "Global Network",
    path: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 Z M3 12h18 M12 3c2.5 2.8 3.7 6 3.7 9s-1.2 6.2-3.7 9c-2.5-2.8-3.7-6-3.7-9s1.2-6.2 3.7-9Z",
    active: false,
  },
  {
    label: "Settings",
    path: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V10c.2.6.8 1 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
    active: false,
  },
] as const;

export default function Dashboard() {
  const { tokens } = useTheme();

  const activities = [
    "Dubai laundry market analyzed",
    "Germany customer behavior updated",
    "Hotel revenue prediction completed",
    "AI automation optimized",
    "Global logistics route calculated",
    "Business intelligence report generated",
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        color: tokens.text,
        display: "flex",
        flexWrap: "wrap",
        background: "transparent",
        transition: surfaceTransition,
        fontFamily:
          '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      <aside
        className="agx-sidebar"
        style={{
          position: "relative",
          width: "280px",
          minHeight: "100vh",
          background: tokens.sidebarBg,
          backdropFilter: tokens.sidebarBlur,
          WebkitBackdropFilter: tokens.sidebarBlur,
          borderRight: `1px solid ${tokens.sidebarBorder}`,
          boxShadow: tokens.sidebarShadow,
          padding: "40px 26px",
          transition: surfaceTransition,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 32%)",
            opacity: tokens.tone === "day" ? 0.95 : 0.4,
            transition: `opacity ${THEME_TRANSITION_MS}ms ease`,
          }}
        />

        <h2
          style={{
            position: "relative",
            color: tokens.accent,
            letterSpacing: "0.32em",
            marginBottom: "52px",
            marginTop: "4px",
            fontSize: "13px",
            fontWeight: 700,
            transition: surfaceTransition,
          }}
        >
          AGXORA
        </h2>

        <nav
          aria-label="Primary"
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`agx-nav-item${item.active ? " is-active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                width: "100%",
                padding: "13px 14px",
                borderRadius: "16px",
                border: item.active
                  ? `1px solid ${tokens.panelBorder}`
                  : "1px solid transparent",
                background: item.active ? tokens.navActiveBg : "transparent",
                boxShadow: item.active ? tokens.navActiveGlow : "none",
                color: item.active ? tokens.accent : tokens.textMuted,
                fontSize: "14px",
                fontWeight: item.active ? 600 : 500,
                letterSpacing: "0.01em",
                textAlign: "left",
                cursor: "pointer",
                transition:
                  "background 360ms cubic-bezier(0.22, 1, 0.36, 1), color 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms cubic-bezier(0.22, 1, 0.36, 1), transform 360ms cubic-bezier(0.22, 1, 0.36, 1), border-color 360ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: item.active ? 1 : 0.78,
                }}
              >
                <NavIcon path={item.path} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section
        style={{
          position: "relative",
          flex: 1,
          padding: "44px 48px 56px",
          minWidth: "320px",
          background: "transparent",
        }}
      >
        {/* Hero header */}
        <div
          style={{
            position: "relative",
            marginBottom: "18px",
            paddingRight: "min(320px, 38%)",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "11px",
              fontWeight: 650,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: tokens.textMuted,
              transition: surfaceTransition,
            }}
          >
            AI Business Operating System
          </p>

          <h1
            style={{
              fontSize: "clamp(46px, 6.2vw, 86px)",
              color: tokens.accent,
              letterSpacing: "-0.01em",
              fontWeight: 700,
              lineHeight: 0.98,
              textShadow: tokens.titleShadow,
              margin: 0,
              transition: surfaceTransition,
            }}
          >
            AGXORA CORE
          </h1>

          <div
            style={{
              position: "absolute",
              top: "0",
              right: 0,
              zIndex: 5,
            }}
          >
            <ThemeSwitcher />
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "32px",
            padding: "8px 14px",
            borderRadius: "999px",
            background: tokens.navActiveBg,
            border: `1px solid ${tokens.panelBorder}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
            backdropFilter: "blur(12px)",
            transition: surfaceTransition,
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 12px rgba(52,211,153,0.75)",
            }}
          />
          <span
            style={{
              color: "#34d399",
              fontWeight: 650,
              letterSpacing: "0.14em",
              fontSize: "11px",
              textTransform: "uppercase",
            }}
          >
            AI System Online
          </span>
        </div>

        <div
          className="agx-glass-panel"
          style={{
            padding: "28px 30px",
            borderRadius: "26px",
            background: tokens.panelBg,
            border: `1px solid ${tokens.panelBorder}`,
            boxShadow: tokens.panelShadow,
            backdropFilter: tokens.cardBlur,
            WebkitBackdropFilter: tokens.cardBlur,
            marginBottom: "36px",
            maxWidth: "760px",
            transition: surfaceTransition,
          }}
        >
          <h2
            style={{
              color: tokens.accent,
              margin: "0 0 10px",
              fontSize: "12px",
              fontWeight: 650,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              transition: surfaceTransition,
            }}
          >
            AGXORA AI Command Center
          </h2>

          <p
            style={{
              color: tokens.textMuted,
              lineHeight: 1.75,
              margin: 0,
              fontSize: "15px",
              maxWidth: "58ch",
              transition: surfaceTransition,
            }}
          >
            Real-time business intelligence, predictive analytics,
            automation monitoring, customer insights and global
            operational control.
          </p>
        </div>

        {/* Globe centerpiece */}
        <div
          style={{
            position: "relative",
            marginBottom: "56px",
          }}
        >
          <AgxoraGlobe3D />
        </div>

        <BusinessOverview />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 420px",
            gap: "22px",
          }}
          className="agx-bottom-grid"
        >
          <div
            className="agx-glass-panel"
            style={{
              padding: "28px 30px",
              borderRadius: "26px",
              background: tokens.panelBg,
              border: `1px solid ${tokens.panelBorder}`,
              boxShadow: tokens.panelShadow,
              backdropFilter: tokens.cardBlur,
              WebkitBackdropFilter: tokens.cardBlur,
              transition: surfaceTransition,
            }}
          >
            <h2
              style={{
                color: tokens.accent,
                marginBottom: "18px",
                marginTop: 0,
                fontSize: "12px",
                fontWeight: 650,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                transition: surfaceTransition,
              }}
            >
              Live AI Activity
            </h2>

            {activities.map((item, index) => (
              <div
                key={index}
                className="agx-activity-row"
                style={{
                  padding: "15px 0",
                  borderBottom: `1px solid ${tokens.divider}`,
                  fontSize: "14px",
                  letterSpacing: "0.01em",
                  color: tokens.text,
                  transition: `${surfaceTransition}, padding 320ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
              >
                <span style={{ opacity: 0.7, marginRight: 10 }}>⚡</span>
                {item}
              </div>
            ))}
          </div>

          <div
            className="agx-glass-panel"
            style={{
              padding: "28px 30px",
              borderRadius: "26px",
              background: tokens.panelBg,
              border: `1px solid ${tokens.panelBorder}`,
              boxShadow: tokens.panelShadow,
              backdropFilter: tokens.cardBlur,
              WebkitBackdropFilter: tokens.cardBlur,
              transition: surfaceTransition,
            }}
          >
            <h2
              style={{
                color: tokens.accent,
                marginBottom: "18px",
                marginTop: 0,
                fontSize: "12px",
                fontWeight: 650,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                transition: surfaceTransition,
              }}
            >
              AGXORA AI
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  padding: "13px 15px",
                  borderRadius: "16px",
                  background: tokens.chatBubbleBg,
                  border: `1px solid ${tokens.divider}`,
                  fontSize: "13.5px",
                  transition: surfaceTransition,
                }}
              >
                Show revenue forecast
              </div>

              <div
                style={{
                  padding: "13px 15px",
                  borderRadius: "16px",
                  background: tokens.chatReplyBg,
                  color: tokens.accent,
                  border: `1px solid ${tokens.panelBorder}`,
                  fontSize: "13.5px",
                  transition: surfaceTransition,
                }}
              >
                Revenue expected to increase by 18% next month.
              </div>

              <div
                style={{
                  padding: "13px 15px",
                  borderRadius: "16px",
                  background: tokens.chatBubbleBg,
                  border: `1px solid ${tokens.divider}`,
                  fontSize: "13.5px",
                  transition: surfaceTransition,
                }}
              >
                Analyze customer trends
              </div>

              <div
                style={{
                  padding: "13px 15px",
                  borderRadius: "16px",
                  background: tokens.chatReplyBg,
                  color: tokens.accent,
                  border: `1px solid ${tokens.panelBorder}`,
                  fontSize: "13.5px",
                  transition: surfaceTransition,
                }}
              >
                Customer retention improved by 12%.
              </div>
            </div>

            <input
              className="agx-input"
              placeholder="Ask AGXORA AI..."
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "16px",
                border: `1px solid ${tokens.inputBorder}`,
                background: tokens.inputBg,
                color: tokens.text,
                outline: "none",
                fontSize: "14px",
                transition: surfaceTransition,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

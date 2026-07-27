"use client";

import AgxoraGlobe3D from "../components/AgxoraGlobe3D";
import { AppShell } from "../components/AppShell";
import { ChatPanel } from "../components/ChatPanel";
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
    <AppShell>
        {/* Hero header — tightened so the Globe leads the first viewport */}
        <div
          className="agx-hero-header"
          style={{
            position: "relative",
            marginTop: "-6px",
            marginBottom: "10px",
            paddingRight: "min(320px, 38%)",
          }}
        >
          <p
            style={{
              margin: "0 0 6px",
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
              fontSize: "clamp(40px, 5.4vw, 72px)",
              color: tokens.accent,
              letterSpacing: "-0.01em",
              fontWeight: 700,
              lineHeight: 0.96,
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
          className="agx-hero-status"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "14px",
            padding: "7px 12px",
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

        {/* Globe centerpiece — immediate first impression, mostly above the fold */}
        <div
          className="agx-hero-globe"
          style={{
            position: "relative",
            marginBottom: "22px",
          }}
        >
          <AgxoraGlobe3D />
        </div>

        <div
          className="agx-glass-panel"
          style={{
            padding: "22px 26px",
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

          <ChatPanel />
        </div>
    </AppShell>
  );
}

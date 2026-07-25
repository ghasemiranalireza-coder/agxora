"use client";

import AgxoraGlobe3D from "../components/AgxoraGlobe3D";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { BusinessOverview } from "../components/dashboard/BusinessOverview";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  `text-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  `backdrop-filter ${THEME_TRANSITION_MS}ms ease`,
].join(", ");

const NAV_ITEMS = [
  { label: "Dashboard", icon: "🏠", active: true },
  { label: "Analytics", icon: "📊", active: false },
  { label: "AI Reports", icon: "🤖", active: false },
  { label: "Customers", icon: "👥", active: false },
  { label: "Global Network", icon: "🌍", active: false },
  { label: "Settings", icon: "⚙️", active: false },
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
          padding: "36px 28px",
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
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 28%)",
            opacity: tokens.tone === "day" ? 0.9 : 0.35,
            transition: `opacity ${THEME_TRANSITION_MS}ms ease`,
          }}
        />

        <h2
          style={{
            position: "relative",
            color: tokens.accent,
            letterSpacing: "0.28em",
            marginBottom: "48px",
            fontSize: "15px",
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
            gap: "8px",
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
                padding: "12px 14px",
                borderRadius: "14px",
                border: "1px solid transparent",
                background: item.active ? tokens.navActiveBg : "transparent",
                boxShadow: item.active ? tokens.navActiveGlow : "none",
                color: item.active ? tokens.accent : tokens.text,
                fontSize: "15px",
                fontWeight: item.active ? 600 : 500,
                letterSpacing: "0.02em",
                textAlign: "left",
                cursor: "pointer",
                transition:
                  "background 280ms ease, color 280ms ease, box-shadow 280ms ease, transform 280ms ease, border-color 280ms ease",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: "16px", opacity: 0.92 }}>
                {item.icon}
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
          padding: "40px",
          minWidth: "320px",
          background: "transparent",
        }}
      >
        <div
          style={{
            position: "relative",
            marginBottom: "8px",
            paddingRight: "min(320px, 40%)",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(44px, 6.5vw, 84px)",
              color: tokens.accent,
              letterSpacing: "0.06em",
              fontWeight: 700,
              lineHeight: 1.05,
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
              top: "8px",
              right: 0,
              zIndex: 5,
            }}
          >
            <ThemeSwitcher />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 14px rgba(52,211,153,0.7)",
            }}
          />

          <span
            style={{
              color: "#34d399",
              fontWeight: 650,
              letterSpacing: "0.16em",
              fontSize: "12px",
              textTransform: "uppercase",
            }}
          >
            AI System Online
          </span>
        </div>

        <div
          className="agx-glass-panel"
          style={{
            padding: "26px 28px",
            borderRadius: "24px",
            background: tokens.panelBg,
            border: `1px solid ${tokens.panelBorder}`,
            boxShadow: tokens.panelShadow,
            backdropFilter: tokens.cardBlur,
            WebkitBackdropFilter: tokens.cardBlur,
            marginBottom: "40px",
            transition: surfaceTransition,
          }}
        >
          <h2
            style={{
              color: tokens.accent,
              margin: "0 0 10px",
              fontSize: "15px",
              fontWeight: 650,
              letterSpacing: "0.14em",
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
              maxWidth: "62ch",
              transition: surfaceTransition,
            }}
          >
            Real-time business intelligence, predictive analytics,
            automation monitoring, customer insights and global
            operational control.
          </p>
        </div>

        <div
          style={{
            position: "relative",
            marginBottom: "60px",
          }}
        >
          <AgxoraGlobe3D />
        </div>

        <BusinessOverview />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 420px",
            gap: "20px",
          }}
          className="agx-bottom-grid"
        >
          <div
            className="agx-glass-panel"
            style={{
              padding: "30px",
              borderRadius: "24px",
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
                marginBottom: "20px",
                marginTop: 0,
                fontSize: "15px",
                fontWeight: 650,
                letterSpacing: "0.12em",
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
                  fontSize: "14.5px",
                  letterSpacing: "0.01em",
                  transition: surfaceTransition,
                }}
              >
                ⚡ {item}
              </div>
            ))}
          </div>

          <div
            className="agx-glass-panel"
            style={{
              padding: "30px",
              borderRadius: "24px",
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
                marginBottom: "20px",
                marginTop: 0,
                fontSize: "15px",
                fontWeight: 650,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                transition: surfaceTransition,
              }}
            >
              🤖 AGXORA AI
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  padding: "13px 14px",
                  borderRadius: "14px",
                  background: tokens.chatBubbleBg,
                  border: `1px solid ${tokens.divider}`,
                  fontSize: "14px",
                  transition: surfaceTransition,
                }}
              >
                👤 Show revenue forecast
              </div>

              <div
                style={{
                  padding: "13px 14px",
                  borderRadius: "14px",
                  background: tokens.chatReplyBg,
                  color: tokens.accent,
                  border: `1px solid ${tokens.panelBorder}`,
                  fontSize: "14px",
                  transition: surfaceTransition,
                }}
              >
                🤖 Revenue expected to increase by 18% next month.
              </div>

              <div
                style={{
                  padding: "13px 14px",
                  borderRadius: "14px",
                  background: tokens.chatBubbleBg,
                  border: `1px solid ${tokens.divider}`,
                  fontSize: "14px",
                  transition: surfaceTransition,
                }}
              >
                👤 Analyze customer trends
              </div>

              <div
                style={{
                  padding: "13px 14px",
                  borderRadius: "14px",
                  background: tokens.chatReplyBg,
                  color: tokens.accent,
                  border: `1px solid ${tokens.panelBorder}`,
                  fontSize: "14px",
                  transition: surfaceTransition,
                }}
              >
                🤖 Customer retention improved by 12%.
              </div>
            </div>

            <input
              className="agx-input"
              placeholder="Ask AGXORA AI..."
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "14px",
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

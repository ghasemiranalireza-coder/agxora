"use client";

import AgxoraGlobe3D from "../components/AgxoraGlobe3D";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { BusinessOverview } from "../components/dashboard/BusinessOverview";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";

const surfaceTransition = `background ${THEME_TRANSITION_MS}ms ease, border-color ${THEME_TRANSITION_MS}ms ease, color ${THEME_TRANSITION_MS}ms ease, box-shadow ${THEME_TRANSITION_MS}ms ease, text-shadow ${THEME_TRANSITION_MS}ms ease`;

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
      }}
    >
      <aside
        style={{
          position: "relative",
          width: "280px",
          minHeight: "100vh",
          background: tokens.sidebarBg,
          backdropFilter: "blur(20px)",
          borderRight: `1px solid ${tokens.sidebarBorder}`,
          padding: "35px",
          transition: surfaceTransition,
        }}
      >
        <h2
          style={{
            color: tokens.accent,
            letterSpacing: "5px",
            marginBottom: "50px",
            transition: surfaceTransition,
          }}
        >
          AGXORA
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "25px",
            fontSize: "18px",
          }}
        >
          <span>🏠 Dashboard</span>
          <span>📊 Analytics</span>
          <span>🤖 AI Reports</span>
          <span>👥 Customers</span>
          <span>🌍 Global Network</span>
          <span>⚙️ Settings</span>
        </div>
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
            marginBottom: "10px",
            paddingRight: "min(320px, 40%)",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(50px,7vw,90px)",
              color: tokens.accent,
              letterSpacing: "4px",
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
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#00ff88",
              boxShadow: "0 0 15px #00ff88",
            }}
          />

          <span
            style={{
              color: "#00ff88",
              fontWeight: "bold",
              letterSpacing: "2px",
            }}
          >
            AI SYSTEM ONLINE
          </span>
        </div>

        <div
          style={{
            padding: "24px",
            borderRadius: "24px",
            background: tokens.chatReplyBg,
            border: `1px solid ${tokens.panelBorder}`,
            marginBottom: "40px",
            transition: surfaceTransition,
          }}
        >
          <h2
            style={{
              color: tokens.accent,
              transition: surfaceTransition,
            }}
          >
            AGXORA AI COMMAND CENTER
          </h2>

          <p
            style={{
              color: tokens.textMuted,
              lineHeight: 1.7,
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
        >
          <div
            style={{
              padding: "30px",
              borderRadius: "24px",
              background: tokens.panelBg,
              border: `1px solid ${tokens.panelBorder}`,
              transition: surfaceTransition,
            }}
          >
            <h2
              style={{
                color: tokens.accent,
                marginBottom: "20px",
                transition: surfaceTransition,
              }}
            >
              Live AI Activity
            </h2>

            {activities.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: "14px 0",
                  borderBottom: `1px solid ${tokens.divider}`,
                  transition: surfaceTransition,
                }}
              >
                ⚡ {item}
              </div>
            ))}
          </div>

          <div
            style={{
              padding: "30px",
              borderRadius: "24px",
              background: tokens.panelBg,
              border: `1px solid ${tokens.panelBorder}`,
              backdropFilter: "blur(20px)",
              transition: surfaceTransition,
            }}
          >
            <h2
              style={{
                color: tokens.accent,
                marginBottom: "20px",
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
                  padding: "12px",
                  borderRadius: "12px",
                  background: tokens.chatBubbleBg,
                  transition: surfaceTransition,
                }}
              >
                👤 Show revenue forecast
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: tokens.chatReplyBg,
                  color: tokens.accent,
                  transition: surfaceTransition,
                }}
              >
                🤖 Revenue expected to increase by 18% next month.
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: tokens.chatBubbleBg,
                  transition: surfaceTransition,
                }}
              >
                👤 Analyze customer trends
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: tokens.chatReplyBg,
                  color: tokens.accent,
                  transition: surfaceTransition,
                }}
              >
                🤖 Customer retention improved by 12%.
              </div>
            </div>

            <input
              placeholder="Ask AGXORA AI..."
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: `1px solid ${tokens.inputBorder}`,
                background: tokens.inputBg,
                color: tokens.text,
                outline: "none",
                transition: surfaceTransition,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

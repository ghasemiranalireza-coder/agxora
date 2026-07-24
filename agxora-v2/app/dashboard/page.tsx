import AgxoraGlobe3D from "../components/AgxoraGlobe3D";
import StarfieldBackground from "../components/StarfieldBackground";
import { BusinessOverview } from "../components/dashboard/BusinessOverview";

export default function Dashboard() {
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
        color: "white",
        display: "flex",
        flexWrap: "wrap",
      }}
    >
      {/* Global procedural space backdrop — stars behind every component */}
      <StarfieldBackground />

      <aside
        style={{
          position: "relative",
          zIndex: 1,
          width: "280px",
          minHeight: "100vh",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(34,211,238,0.25)",
          padding: "35px",
        }}
      >
        <h2
          style={{
            color: "#22d3ee",
            letterSpacing: "5px",
            marginBottom: "50px",
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
          zIndex: 1,
          flex: 1,
          padding: "40px",
          minWidth: "320px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(50px,7vw,90px)",
            color: "#22d3ee",
            letterSpacing: "4px",
            textShadow: "0 0 40px rgba(34,211,238,0.5)",
            marginBottom: "10px",
          }}
        >
          AGXORA CORE
        </h1>

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
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.3)",
            marginBottom: "40px",
          }}
        >
          <h2 style={{ color: "#22d3ee" }}>
            AGXORA AI COMMAND CENTER
          </h2>

          <p
            style={{
              color: "#cbd5e1",
              lineHeight: 1.7,
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
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(34,211,238,0.3)",
            }}
          >
            <h2
              style={{
                color: "#22d3ee",
                marginBottom: "20px",
              }}
            >
              Live AI Activity
            </h2>

            {activities.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: "14px 0",
                  borderBottom:
                    "1px solid rgba(255,255,255,0.08)",
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
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(34,211,238,0.3)",
              backdropFilter: "blur(20px)",
            }}
          >
            <h2
              style={{
                color: "#22d3ee",
                marginBottom: "20px",
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
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                👤 Show revenue forecast
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(34,211,238,0.08)",
                  color: "#22d3ee",
                }}
              >
                🤖 Revenue expected to increase by 18% next month.
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                👤 Analyze customer trends
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(34,211,238,0.08)",
                  color: "#22d3ee",
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
                border: "1px solid rgba(34,211,238,0.3)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                outline: "none",
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
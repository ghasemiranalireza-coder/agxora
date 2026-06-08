import AgxoraGlobe from "../components/AgxoraGlobe";

export default function Dashboard() {
  const stats = [
    { title: "Global Clients", value: "2,486", icon: "🌍" },
    { title: "Revenue", value: "€482K", icon: "💰" },
    { title: "AI Reports", value: "1,328", icon: "🤖" },
    { title: "Automation", value: "97%", icon: "⚡" },
    { title: "Live Nodes", value: "24", icon: "🛰️" },
    { title: "Predictions", value: "99.2%", icon: "📈" },
  ];

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
        background:
          "radial-gradient(circle at center, #10214b 0%, #081120 45%, #03060d 100%)",
        color: "white",
        display: "flex",
        flexWrap: "wrap",
      }}
    >
      <aside
        style={{
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
          <AgxoraGlobe />

          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(34,211,238,0.4)",
              backdropFilter: "blur(10px)",
              borderRadius: "999px",
              padding: "12px 26px",
              color: "#22d3ee",
              fontWeight: "bold",
              letterSpacing: "2px",
            }}
          >
            AGXORA AI CORE
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: "20px",
            marginBottom: "50px",
          }}
        >
          {stats.map((item) => (
            <div
              key={item.title}
              style={{
                padding: "24px",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(34,211,238,0.3)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "10px",
                }}
              >
                {item.icon}
              </div>

              <div
                style={{
                  opacity: 0.8,
                  marginBottom: "8px",
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  fontSize: "34px",
                  color: "#22d3ee",
                  fontWeight: "bold",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

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
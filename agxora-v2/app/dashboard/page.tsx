import AgxoraGlobe from "../components/AgxoraGlobe";

export default function Dashboard() {
  const stats = [
    { title: "Active Clients", value: "248", icon: "👥" },
    { title: "Revenue", value: "€48,000", icon: "💰" },
    { title: "AI Reports", value: "132", icon: "🤖" },
    { title: "Automation", value: "87%", icon: "⚡" },
  ];

  const activities = [
    "AI generated a new business report",
    "Customer analytics updated",
    "Revenue forecast completed",
    "Automation workflow optimized",
    "Market trend analysis finished",
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
      {/* SIDEBAR */}

      <aside
        style={{
          width: "260px",
          minHeight: "100vh",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(34,211,238,0.25)",
          padding: "30px",
        }}
      >
        <h2
          style={{
            color: "#22d3ee",
            letterSpacing: "4px",
            marginBottom: "50px",
          }}
        >
          AGXORA
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            fontSize: "18px",
          }}
        >
          <span>🏠 Dashboard</span>
          <span>📊 Analytics</span>
          <span>🤖 AI Reports</span>
          <span>👥 Customers</span>
          <span>⚙️ Settings</span>
        </div>
      </aside>

      {/* CONTENT */}

      <section
        style={{
          flex: 1,
          padding: "40px",
          minWidth: "320px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(42px,6vw,72px)",
            color: "#22d3ee",
            marginBottom: "5px",
          }}
        >
          AGXORA CORE
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#00ff88",
            fontWeight: "bold",
            marginBottom: "40px",
          }}
        >
          <span>●</span>
          <span>AI SYSTEM ONLINE</span>
        </div>

        {/* GLOBE */}

        <div
          style={{
            marginBottom: "60px",
          }}
        >
          <AgxoraGlobe />
        </div>

        {/* KPI */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: "20px",
            marginBottom: "50px",
          }}
        >
          {stats.map((item) => (
            <div
              key={item.title}
              style={{
                padding: "24px",
                borderRadius: "22px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(34,211,238,0.3)",
                backdropFilter: "blur(15px)",
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  marginBottom: "10px",
                }}
              >
                {item.icon}
              </div>

              <h3>{item.title}</h3>

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

        {/* LIVE AI ACTIVITY */}

        <div
          style={{
            padding: "25px",
            borderRadius: "22px",
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
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              ⚡ {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
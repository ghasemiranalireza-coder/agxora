export default function Dashboard() {
  const stats = [
    {
      title: "Active Clients",
      value: "248",
      icon: "👥",
    },
    {
      title: "Revenue",
      value: "€48,000",
      icon: "💰",
    },
    {
      title: "AI Reports",
      value: "132",
      icon: "🤖",
    },
    {
      title: "Automation",
      value: "87%",
      icon: "⚡",
    },
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
          "radial-gradient(circle at center, #0d1b3d 0%, #081120 40%, #050910 100%)",
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
          background: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(34,211,238,0.25)",
          padding: "30px",
        }}
      >
        <h2
          style={{
            color: "#22d3ee",
            marginBottom: "40px",
            letterSpacing: "4px",
          }}
        >
          AGXORA
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "22px",
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

      {/* MAIN CONTENT */}

      <section
        style={{
          flex: 1,
          padding: "40px",
          minWidth: "300px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(36px,6vw,60px)",
            color: "#22d3ee",
            marginBottom: "10px",
          }}
        >
          AGXORA CORE
        </h1>

        <p
          style={{
            opacity: 0.8,
            marginBottom: "50px",
            fontSize: "18px",
          }}
        >
          AI Command Center
        </p>

        {/* CORE */}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "60px",
          }}
        >
          <div
            style={{
              width: "320px",
              height: "320px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle, rgba(34,211,238,0.25) 0%, rgba(0,0,0,0) 70%)",
              boxShadow:
                "0 0 30px #22d3ee, 0 0 60px rgba(34,211,238,0.6), 0 0 120px rgba(34,211,238,0.4)",
              border: "3px solid rgba(34,211,238,0.8)",
            }}
          >
            <div
              style={{
                width: "220px",
                height: "220px",
                borderRadius: "50%",
                border: "2px solid rgba(34,211,238,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  fontSize: "50px",
                }}
              >
                🌐
              </div>

              <div
                style={{
                  color: "#22d3ee",
                  fontSize: "30px",
                  fontWeight: "bold",
                  letterSpacing: "3px",
                }}
              >
                AGXORA
              </div>

              <div
                style={{
                  marginTop: "10px",
                  opacity: 0.8,
                }}
              >
                AI COMMAND CORE
              </div>
            </div>
          </div>
        </div>

        {/* KPI */}

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
                borderRadius: "20px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(34,211,238,0.3)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  fontSize: "30px",
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

        {/* ACTIVITY FEED */}

        <div
          style={{
            padding: "25px",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.05)",
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
                padding: "12px 0",
                borderBottom:
                  "1px solid rgba(255,255,255,0.08)",
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
export default function Home() {
  const features = [
    {
      icon: "🧠",
      title: "AI Powered",
      text: "Intelligent business automation",
    },
    {
      icon: "📊",
      title: "Data Intelligence",
      text: "Real-time analytics",
    },
    {
      icon: "🎯",
      title: "Precision",
      text: "Data-driven decisions",
    },
    {
      icon: "⚡",
      title: "Automation",
      text: "Scalable workflows",
    },
  ];

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url('/alien-clean.png')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: "white",
        overflowX: "hidden",
      }}
    >
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "25px 50px",
          backdropFilter: "blur(12px)",
          background: "rgba(0,0,0,0.2)",
          borderBottom: "1px solid rgba(34,211,238,0.2)",
        }}
      >
        <h2
          style={{
            color: "#22d3ee",
            letterSpacing: "4px",
          }}
        >
          AGXORA
        </h2>

        <div
          style={{
            display: "flex",
            gap: "30px",
          }}
        >
          <span>Home</span>
          <span>Features</span>
          <span>Solutions</span>
          <span>Contact</span>
        </div>
      </nav>

      <section
        style={{
          minHeight: "90vh",
          display: "flex",
          alignItems: "center",
          paddingLeft: "8%",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
          }}
        >
          <h1
            style={{
              fontSize: "80px",
              marginBottom: "10px",
              color: "#22d3ee",
              textShadow: "0 0 30px rgba(34,211,238,0.7)",
            }}
          >
            AGXORA
          </h1>

          <h2
            style={{
              fontSize: "38px",
              marginBottom: "20px",
            }}
          >
            AI Business Intelligence Platform
          </h2>

          <p
            style={{
              fontSize: "22px",
              lineHeight: "1.8",
              color: "#d1d5db",
              marginBottom: "35px",
            }}
          >
            Transform data into decisions with advanced AI,
            automation and predictive analytics.
          </p>

          <button
            style={{
              background: "#22d3ee",
              color: "#000",
              border: "none",
              padding: "18px 40px",
              borderRadius: "999px",
              fontWeight: "bold",
              fontSize: "18px",
              cursor: "pointer",
              boxShadow: "0 0 25px rgba(34,211,238,0.6)",
            }}
          >
            Launch Platform
          </button>
        </div>
      </section>

      <section
        style={{
          padding: "100px 8%",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: "25px",
        }}
      >
        {features.map((item) => (
          <div
            key={item.title}
            style={{
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(15px)",
              border: "1px solid rgba(34,211,238,0.25)",
              borderRadius: "25px",
              padding: "30px",
            }}
          >
            <div
              style={{
                fontSize: "50px",
                marginBottom: "20px",
              }}
            >
              {item.icon}
            </div>

            <h3
              style={{
                color: "#22d3ee",
                marginBottom: "10px",
              }}
            >
              {item.title}
            </h3>

            <p>{item.text}</p>
          </div>
        ))}
      </section>

      <section
        style={{
          padding: "120px 8%",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "55px",
            color: "#22d3ee",
            marginBottom: "30px",
          }}
        >
          The Future of Business Intelligence
        </h2>

        <p
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            fontSize: "22px",
            lineHeight: "1.8",
          }}
        >
          AGXORA combines artificial intelligence,
          predictive analytics and automation into
          a single powerful ecosystem.
        </p>
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: "80px 20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h3
          style={{
            color: "#22d3ee",
            letterSpacing: "4px",
          }}
        >
          AGXORA
        </h3>

        <p>© 2026 AGXORA. All rights reserved.</p>
      </footer>
    </main>
  );
}
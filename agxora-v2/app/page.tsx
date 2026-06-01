export default function Home() {
  const features = [
    {
      icon: "🧠",
      title: "AI Powered",
      text: "Intelligente Automatisierung",
    },
    {
      icon: "📊",
      title: "Data Intelligence",
      text: "Echtzeit Analysen",
    },
    {
      icon: "🎯",
      title: "Precision",
      text: "Datengestützte Entscheidungen",
    },
    {
      icon: "⚡",
      title: "Automation",
      text: "Skalierbare Workflows",
    },
  ];

  const pricing = [
    {
      title: "Starter",
      price: "€29",
      desc: "Perfect for small teams",
    },
    {
      title: "Professional",
      price: "€99",
      desc: "For growing companies",
    },
    {
      title: "Enterprise",
      price: "Custom",
      desc: "For large organizations",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('/alien-clean.png')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundColor: "#020617",
        color: "white",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* NAVBAR */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "18px 30px",
          borderRadius: "20px",
        }}
      >
        <h2 style={{ margin: 0, letterSpacing: "3px" }}>
          AGXORA
        </h2>

        <div
          style={{
            display: "flex",
            gap: "35px",
            fontWeight: "600",
          }}
        >
          <span>Home</span>
          <span>Features</span>
          <span>Pricing</span>
          <span>Contact</span>
        </div>

        <button
          style={{
            background: "#1677ff",
            color: "white",
            border: "none",
            borderRadius: "999px",
            padding: "12px 25px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Login
        </button>
      </nav>

      {/* HERO */}
      <section
        style={{
          maxWidth: "1400px",
          margin: "70px auto 0",
          paddingLeft: "60px",
          paddingRight: "60px",
        }}
      >
        <div style={{ maxWidth: "520px" }}>
          <h1
            style={{
              fontSize: "58px",
              marginBottom: "15px",
              letterSpacing: "4px",
              textShadow:
                "0 0 10px rgba(0,180,255,.9), 0 0 20px rgba(0,180,255,.8), 0 0 40px rgba(0,180,255,.6)",
            }}
          >
            AGXORA
          </h1>

          <div
            style={{
              width: "140px",
              height: "4px",
              borderRadius: "999px",
              background: "#22d3ee",
              marginBottom: "25px",
            }}
          />

          <p
            style={{
              fontSize: "28px",
              lineHeight: "1.5",
              marginBottom: "40px",
              fontWeight: "500",
            }}
          >
            AI-Powered Business Intelligence
          </p>

          <div
            style={{
              display: "flex",
              gap: "20px",
            }}
          >
            <button
              style={{
                background: "#1677ff",
                color: "white",
                border: "none",
                borderRadius: "999px",
                padding: "16px 36px",
                fontSize: "18px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🚀 Jetzt starten
            </button>

            <button
              style={{
                background: "rgba(0,120,255,0.15)",
                color: "white",
                border: "2px solid #22d3ee",
                borderRadius: "999px",
                padding: "16px 36px",
                fontSize: "18px",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              ▶ Live Demo
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "70px auto 0",
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "20px",
        }}
      >
        {features.map((item, index) => (
          <div
            key={index}
            style={{
              background: "rgba(0,20,40,0.45)",
              border: "1px solid rgba(0,180,255,0.3)",
              backdropFilter: "blur(12px)",
              borderRadius: "20px",
              padding: "30px",
              textAlign: "center",
              boxShadow: "0 0 20px rgba(0,180,255,0.15)",
            }}
          >
            <div
              style={{
                fontSize: "42px",
                marginBottom: "15px",
              }}
            >
              {item.icon}
            </div>

            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </section>

      {/* ABOUT */}
      <section
        style={{
          maxWidth: "1000px",
          margin: "120px auto 0",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#22d3ee",
            fontSize: "42px",
            marginBottom: "25px",
          }}
        >
          About AGXORA
        </h2>

        <p
          style={{
            fontSize: "20px",
            lineHeight: "1.8",
            opacity: 0.9,
          }}
        >
          AGXORA combines artificial intelligence,
          data analytics and automation to help
          companies make smarter and faster decisions.
          Our mission is to transform business data
          into competitive advantages.
        </p>
      </section>

      {/* PRICING */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "120px auto 0",
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "25px",
        }}
      >
        {pricing.map((plan) => (
          <div
            key={plan.title}
            style={{
              background: "rgba(0,20,40,0.45)",
              border: "1px solid rgba(0,180,255,0.3)",
              borderRadius: "20px",
              padding: "40px",
              textAlign: "center",
            }}
          >
            <h3>{plan.title}</h3>

            <h2
              style={{
                color: "#22d3ee",
                fontSize: "42px",
              }}
            >
              {plan.price}
            </h2>

            <p>{plan.desc}</p>
          </div>
        ))}
      </section>

      {/* CONTACT */}
      <section
        style={{
          maxWidth: "800px",
          margin: "120px auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#22d3ee",
            marginBottom: "30px",
          }}
        >
          Contact Us
        </h2>

        <input
          placeholder="Email Address"
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            border: "none",
            marginBottom: "15px",
          }}
        />

        <textarea
          placeholder="Your Message"
          rows={5}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            border: "none",
            marginBottom: "15px",
          }}
        />

        <button
          style={{
            background: "#1677ff",
            color: "white",
            border: "none",
            borderRadius: "999px",
            padding: "16px 36px",
            cursor: "pointer",
          }}
        >
          Send Message
        </button>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          textAlign: "center",
          marginTop: "90px",
          paddingBottom: "60px",
        }}
      >
        <h3
          style={{
            letterSpacing: "4px",
            color: "#22d3ee",
          }}
        >
          AGXORA
        </h3>

        <p
          style={{
            opacity: 0.8,
          }}
        >
          Business Intelligence Platform © 2026
        </p>
      </footer>
    </main>
  );
}
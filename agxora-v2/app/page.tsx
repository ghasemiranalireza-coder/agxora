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
          "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('/alien-clean.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundColor: "#020617",
        color: "white",
        padding: "20px",
        overflowX: "hidden",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* NAVBAR */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "18px 25px",
          borderRadius: "20px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            margin: 0,
            letterSpacing: "3px",
            color: "#22d3ee",
          }}
        >
          AGXORA
        </h2>

        <div
          style={{
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
            justifyContent: "center",
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
          margin: "80px auto 0",
          padding: "0 20px",
        }}
      >
        <div style={{ maxWidth: "650px" }}>
          <h1
            style={{
              fontSize: "clamp(40px, 8vw, 72px)",
              marginBottom: "15px",
              letterSpacing: "4px",
              textShadow:
                "0 0 10px rgba(0,180,255,.9),0 0 25px rgba(0,180,255,.8)",
            }}
          >
            AGXORA
          </h1>

          <div
            style={{
              width: "150px",
              height: "4px",
              borderRadius: "999px",
              background: "#22d3ee",
              marginBottom: "25px",
            }}
          />

          <p
            style={{
              fontSize: "clamp(20px,4vw,30px)",
              lineHeight: "1.5",
              marginBottom: "40px",
            }}
          >
            AI-Powered Business Intelligence
          </p>

          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
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
          margin: "80px auto 0",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
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
          padding: "0 20px",
        }}
      >
        <h2
          style={{
            color: "#22d3ee",
            fontSize: "clamp(32px,6vw,48px)",
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
        </p>
      </section>

      {/* PRICING */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "120px auto 0",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(280px,1fr))",
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
          padding: "0 20px",
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

      <footer
        style={{
          textAlign: "center",
          marginTop: "80px",
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

        <p style={{ opacity: 0.8 }}>
          Business Intelligence Platform © 2026
        </p>
      </footer>
    </main>
  );
}
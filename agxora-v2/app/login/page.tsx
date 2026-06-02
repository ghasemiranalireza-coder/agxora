export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(135deg,#020617,#0f172a,#111827)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(10,20,50,0.8)",
          border: "1px solid rgba(34,211,238,0.3)",
          borderRadius: "24px",
          padding: "40px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 0 30px rgba(34,211,238,0.2)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#22d3ee",
            marginBottom: "30px",
            fontSize: "42px",
            letterSpacing: "4px",
          }}
        >
          AGXORA
        </h1>

        <h2
          style={{
            textAlign: "center",
            color: "white",
            marginBottom: "25px",
          }}
        >
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "15px",
            borderRadius: "12px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "white",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "25px",
            borderRadius: "12px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "white",
          }}
        />

        <button
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: "14px",
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Sign In
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#94a3b8",
          }}
        >
          AI Powered Business Intelligence
        </p>
      </div>
    </main>
  );
}
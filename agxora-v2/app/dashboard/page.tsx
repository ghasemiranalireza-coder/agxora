export default function Dashboard() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#020617,#0f172a,#1e293b)",
        color: "white",
        padding: "40px",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          color: "#22d3ee",
          marginBottom: "10px",
        }}
      >
        AGXORA Dashboard
      </h1>

      <p
        style={{
          fontSize: "20px",
          opacity: 0.8,
          marginBottom: "40px",
        }}
      >
        Welcome to AGXORA AI Business Intelligence Platform
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: "20px",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #22d3ee",
            borderRadius: "20px",
            padding: "25px",
          }}
        >
          <h2>👥 Customers</h2>
          <h1>248</h1>
        </div>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #22d3ee",
            borderRadius: "20px",
            padding: "25px",
          }}
        >
          <h2>📈 Revenue</h2>
          <h1>€48,000</h1>
        </div>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #22d3ee",
            borderRadius: "20px",
            padding: "25px",
          }}
        >
          <h2>🤖 AI Reports</h2>
          <h1>132</h1>
        </div>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #22d3ee",
            borderRadius: "20px",
            padding: "25px",
          }}
        >
          <h2>⚡ Automation</h2>
          <h1>87%</h1>
        </div>
      </div>
    </main>
  );
}
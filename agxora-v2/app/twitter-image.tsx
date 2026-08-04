import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AGXORA — AI Business Operating System";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(145deg, #05070c 0%, #0b1220 55%, #0a1628 100%)",
          color: "#f8fafc",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.32em",
            fontWeight: 700,
            color: "#7dd3fc",
            marginBottom: 28,
          }}
        >
          AGXORA
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 650,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          AI Business Operating System
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            color: "#94a3b8",
            maxWidth: 760,
            lineHeight: 1.4,
          }}
        >
          Enterprise AI, automation, and analytics — production-ready.
        </div>
      </div>
    ),
    { ...size },
  );
}

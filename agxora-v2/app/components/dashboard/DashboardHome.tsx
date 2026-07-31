"use client";

import type { JSX } from "react";
import { ChatPanel } from "../ChatPanel";
import { BusinessOverview } from "./BusinessOverview";
import { HeroSection } from "./HeroSection";
import { THEME_TRANSITION_MS, useTheme } from "../../lib/theme";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `text-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `backdrop-filter ${THEME_TRANSITION_MS}ms ease`,
].join(", ");

/**
 * Dashboard home content — lazy-loaded by the route page.
 * Preserves existing Hero / overview / chat structure.
 */
export function DashboardHome(): JSX.Element {
  const { tokens } = useTheme();

  const activities = [
    "Dubai laundry market analyzed",
    "Germany customer behavior updated",
    "Hotel revenue prediction completed",
    "AI automation optimized",
    "Global logistics route calculated",
    "Business intelligence report generated",
  ];

  return (
    <>
      <HeroSection />

      <div
        id="agx-command-center"
        className="agx-glass-panel agx-hero-follow"
        style={{
          padding: "22px 26px",
          borderRadius: "26px",
          background: tokens.panelBg,
          border: `1px solid ${tokens.panelBorder}`,
          boxShadow: tokens.panelShadow,
          backdropFilter: tokens.cardBlur,
          WebkitBackdropFilter: tokens.cardBlur,
          marginBottom: "36px",
          maxWidth: "760px",
          transition: surfaceTransition,
        }}
      >
        <h2
          style={{
            color: tokens.accent,
            margin: "0 0 10px",
            fontSize: "12px",
            fontWeight: 650,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            transition: surfaceTransition,
          }}
        >
          AGXORA AI Command Center
        </h2>

        <p
          style={{
            color: tokens.textMuted,
            lineHeight: 1.75,
            margin: 0,
            fontSize: "15px",
            maxWidth: "58ch",
            transition: surfaceTransition,
          }}
        >
          Real-time business intelligence, predictive analytics, automation
          monitoring, customer insights and global operational control.
        </p>
      </div>

      <BusinessOverview />

      <div
        id="agx-live-activity"
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 420px",
          gap: "22px",
        }}
        className="agx-bottom-grid"
      >
        <div
          className="agx-glass-panel"
          style={{
            padding: "28px 30px",
            borderRadius: "26px",
            background: tokens.panelBg,
            border: `1px solid ${tokens.panelBorder}`,
            boxShadow: tokens.panelShadow,
            backdropFilter: tokens.cardBlur,
            WebkitBackdropFilter: tokens.cardBlur,
            transition: surfaceTransition,
          }}
        >
          <h2
            style={{
              color: tokens.accent,
              marginBottom: "18px",
              marginTop: 0,
              fontSize: "12px",
              fontWeight: 650,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              transition: surfaceTransition,
            }}
          >
            Live AI Activity
          </h2>

          {activities.map((item, index) => (
            <div
              key={index}
              className="agx-activity-row"
              style={{
                padding: "15px 0",
                borderBottom: `1px solid ${tokens.divider}`,
                fontSize: "14px",
                letterSpacing: "0.01em",
                color: tokens.text,
                transition: `${surfaceTransition}, padding 320ms cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
            >
              <span style={{ opacity: 0.7, marginRight: 10 }}>⚡</span>
              {item}
            </div>
          ))}
        </div>

        <ChatPanel />
      </div>
    </>
  );
}

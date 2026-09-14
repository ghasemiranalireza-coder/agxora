"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LANDING_FADE, hydrateSafeMotion } from "./motion";

const NODES = [
  { id: "business", x: 90 },
  { id: "agxora", x: 270 },
  { id: "agents", x: 450 },
  { id: "systems", x: 630 },
] as const;

/** Abstract business → AGXORA → agents → systems map. No provider states. */
export function LandingNetwork(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <section className="p31-network" aria-labelledby="p31-network-title">
      <div className="p31-wrap">
        <motion.div
          className="p31-section__intro"
          {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <h2 id="p31-network-title" className="p31-display">
            {t("landing.network.title")}
          </h2>
          <p className="p31-lead">{t("landing.network.lead")}</p>
        </motion.div>

        <motion.div
          className="p31-network__stage"
          {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <svg
            className="p31-network__svg"
            viewBox="0 0 720 200"
            role="img"
            aria-labelledby="p31-network-title p31-network-desc"
          >
            <title id="p31-network-desc">{t("landing.network.aria")}</title>
            <defs>
              <linearGradient id="p31-net-line" x1="0" x2="1">
                <stop offset="0%" stopColor="#c9a66b" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#4ea6f5" stopOpacity="0.22" />
              </linearGradient>
            </defs>
            {NODES.slice(0, -1).map((node, index) => (
              <line
                key={`${node.id}-edge`}
                x1={node.x + 28}
                y1={78}
                x2={NODES[index + 1].x - 28}
                y2={78}
                stroke="url(#p31-net-line)"
                strokeWidth="1.5"
              />
            ))}
            {NODES.map((node) => (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={78}
                  r="28"
                  fill="rgba(14, 22, 36, 0.92)"
                  stroke={node.id === "agxora" ? "#c9a66b" : "rgba(148, 163, 184, 0.32)"}
                  strokeWidth={node.id === "agxora" ? 1.6 : 1}
                />
                <text
                  x={node.x}
                  y={132}
                  textAnchor="middle"
                  fill="#f4f8fb"
                  fontSize="13"
                  fontWeight="650"
                >
                  {t(`landing.network.${node.id}`)}
                </text>
              </g>
            ))}
          </svg>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_METRICS } from "./content";
import { LANDING_FADE_UP } from "./motion";

export function LandingMetrics(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="agx-landing-section" aria-labelledby="landing-metrics-title">
      <div className="agx-landing-section__inner">
        <p className="agx-landing-kicker">Capabilities</p>
        <h2 id="landing-metrics-title" className="agx-landing-title">
          Built for serious operators
        </h2>
        <p className="agx-landing-lead">
          AGXORA ships as an enterprise AI platform — not a collection of demos.
        </p>

        <div className="agx-landing-metrics" ref={ref}>
          {LANDING_METRICS.map((metric, index) => (
            <motion.div
              key={metric.label}
              className="agx-landing-metric"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={
                visible || reduceMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 12 }
              }
              transition={{
                ...LANDING_FADE_UP,
                delay: reduceMotion ? 0 : index * 0.05,
              }}
            >
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

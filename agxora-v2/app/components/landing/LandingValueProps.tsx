"use client";

import type { JSX } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_VALUE_PROPS } from "./content";
import { LandingIcon } from "./LandingIcons";

export function LandingValueProps(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="platform"
      className="agx-landing-section"
      aria-labelledby="landing-platform-title"
    >
      <div className="agx-landing-section__inner">
        <p className="agx-landing-kicker">Platform</p>
        <h2 id="landing-platform-title" className="agx-landing-title">
          What AGXORA is for
        </h2>
        <p className="agx-landing-lead">
          One operating system for enterprise AI, automation, analytics, identity,
          and integrations — with security treated as a product surface.
        </p>

        <div className="agx-landing-values">
          {LANDING_VALUE_PROPS.map((item, index) => (
            <motion.article
              key={item.id}
              className="agx-landing-value"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.04 }}
            >
              <div className="agx-landing-value__icon" aria-hidden="true">
                <LandingIcon name={item.icon} />
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link href={item.href}>{item.cta}</Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

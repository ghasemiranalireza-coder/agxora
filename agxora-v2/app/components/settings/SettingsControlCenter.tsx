"use client";

import { useCallback, useEffect, useMemo, useState, type JSX, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  SETTINGS_KPIS,
  SETTINGS_NAV,
  type SettingsSectionId,
} from "../../lib/settings";
import { Card, Skeleton } from "../ui";
import { SettingsNav } from "./SettingsNav";
import { SettingsSectionPanel } from "./SettingsPanels";

function KpiStrip(): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {SETTINGS_KPIS.map((kpi) => (
        <Card key={kpi.id} padding="16px" hover={false}>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {kpi.label}
          </p>
          <p
            className="mt-2 text-xl font-semibold tabular-nums"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {kpi.value}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {kpi.caption}
          </p>
        </Card>
      ))}
    </div>
  );
}

/**
 * Enterprise Settings Control Center — two-column configuration hub.
 * Does not modify Hero, Sidebar chrome, Finance, CRM, Creator, Automation, or Documents modules.
 */
function initialSection(): SettingsSectionId {
  if (typeof window === "undefined") return "profile";
  const hash = window.location.hash.replace("#", "") as SettingsSectionId;
  return SETTINGS_NAV.some((item) => item.id === hash) ? hash : "profile";
}

export function SettingsControlCenter(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const [section, setSection] = useState<SettingsSectionId>(initialSection);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(t);
  }, [section]);

  const onSelect = useCallback((id: SettingsSectionId) => {
    setLoading(true);
    setSection(id);
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  const activeMeta = useMemo(
    () => SETTINGS_NAV.find((item) => item.id === section) ?? SETTINGS_NAV[0],
    [section],
  );

  const onNavKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const idx = SETTINGS_NAV.findIndex((item) => item.id === section);
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const next = SETTINGS_NAV[(idx + 1) % SETTINGS_NAV.length];
      onSelect(next.id);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = SETTINGS_NAV[(idx - 1 + SETTINGS_NAV.length) % SETTINGS_NAV.length];
      onSelect(prev.id);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <motion.header
        className="space-y-2"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          AGXORA Control Center
        </p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          Settings
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Enterprise configuration for every AGXORA module — profile, organization, AI, appearance,
          security, billing, and developer controls in one place.
        </p>
      </motion.header>

      <KpiStrip />

      <div
        className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]"
        onKeyDown={onNavKeyDown}
      >
        <SettingsNav items={SETTINGS_NAV} active={section} onSelect={onSelect} />

        <div
          className="min-w-0 space-y-3"
          role="region"
          aria-labelledby={`settings-nav-${section}`}
        >
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {activeMeta.label} · {activeMeta.description}
          </p>
          <motion.div
            key={section}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {loading ? (
              <Card className="space-y-3" padding="24px" hover={false}>
                <Skeleton height={28} width="40%" />
                <Skeleton height={16} width="70%" />
                <Skeleton height={120} width="100%" />
                <Skeleton height={48} width="100%" />
              </Card>
            ) : (
              <SettingsSectionPanel section={section} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

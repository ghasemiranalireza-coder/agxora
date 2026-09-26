import type { JSX } from "react";
import { useLocale } from "../../../lib/i18n";
import { SYSTEM_NODES, WORKFORCE_NODES, type VisualStatus } from "./model";
import { StatusMark } from "./StatusMark";

function Emblem({ kind }: { readonly kind: "business" | "core" | "agents" | "systems" }): JSX.Element {
  if (kind === "business") {
    return (
      <svg viewBox="0 0 64 64" className="p31-sys__glyph" aria-hidden="true">
        <rect x="18" y="16" width="28" height="32" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M26 48V36h12v12" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M24 24h4M36 24h4M24 30h4M36 30h4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === "core") {
    return (
      <svg viewBox="0 0 64 64" className="p31-sys__glyph" aria-hidden="true">
        <circle cx="32" cy="14" r="2.2" fill="currentColor" />
        <circle cx="48" cy="40" r="2.2" fill="currentColor" />
        <circle cx="16" cy="40" r="2.2" fill="currentColor" />
        <path d="M32 26V16M37 35l9 4M27 35l-9 4" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === "agents") {
    return (
      <svg viewBox="0 0 64 64" className="p31-sys__glyph" aria-hidden="true">
        <circle cx="24" cy="28" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="40" cy="24" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="38" cy="40" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M28 30l8-4M28 31l7 7" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="p31-sys__glyph" aria-hidden="true">
      <rect x="14" y="18" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="36" y="18" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="25" y="36" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M28 23h8M32 28v8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function statusLabel(status: VisualStatus, t: (key: string) => string): string {
  if (status === "live") return t("landing.visuals.statusLive");
  if (status === "direction") return t("landing.visuals.statusDirection");
  if (status === "available") return t("landing.visuals.statusAvailable");
  return t("landing.visuals.statusWorkspace");
}

/** Business context → AGXORA → AI workforce → systems. */
export function BusinessSystemDiagram(): JSX.Element {
  const { t } = useLocale();

  return (
    <ol className="p31-sys" aria-label={t("landing.visuals.flowAria")}>
      <li className="p31-sys__card">
        <div className="p31-sys__emblem">
          <Emblem kind="business" />
        </div>
        <h3 className="p31-sys__title">{t("landing.network.business")}</h3>
        <ul className="p31-sys__chips">
          <li>{t("landing.visuals.context")}</li>
          <li>{t("landing.visuals.customers")}</li>
          <li>{t("landing.visuals.operations")}</li>
          <li>{t("landing.visuals.goals")}</li>
        </ul>
      </li>
      <li className="p31-sys__card p31-sys__card--core">
        <div className="p31-sys__emblem">
          <Emblem kind="core" />
          <span className="p31-sys__mono">AG</span>
        </div>
        <h3 className="p31-sys__title">{t("landing.network.agxora")}</h3>
        <p className="p31-sys__meta">{t("landing.visuals.operatingLayer")}</p>
      </li>
      <li className="p31-sys__card">
        <div className="p31-sys__emblem">
          <Emblem kind="agents" />
        </div>
        <h3 className="p31-sys__title">{t("landing.network.agents")}</h3>
        <ul className="p31-sys__list">
          {WORKFORCE_NODES.map((node) => (
            <li key={node.id} className="p31-sys__row">
              <span>{t(`landing.visuals.${node.id}`)}</span>
              <StatusMark tone={node.status}>{statusLabel(node.status, t)}</StatusMark>
            </li>
          ))}
        </ul>
      </li>
      <li className="p31-sys__card">
        <div className="p31-sys__emblem">
          <Emblem kind="systems" />
        </div>
        <h3 className="p31-sys__title">{t("landing.network.systems")}</h3>
        <ul className="p31-sys__list">
          {SYSTEM_NODES.map((node) => (
            <li key={node.id} className="p31-sys__row">
              <span>{t(`landing.visuals.${node.id}`)}</span>
              <StatusMark tone={node.status}>{statusLabel(node.status, t)}</StatusMark>
            </li>
          ))}
        </ul>
      </li>
    </ol>
  );
}

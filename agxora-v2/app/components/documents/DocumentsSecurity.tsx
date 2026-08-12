"use client";

import type { JSX } from "react";
import type { SecurityControl } from "../../lib/documents";
import { SHARE_SCOPES, shareLabel } from "../../lib/documents";
import { useLocale } from "../../lib/i18n";
import { Badge, Card } from "../ui";

export function DocumentsSecurity({
  controls,
}: {
  readonly controls: readonly SecurityControl[];
}): JSX.Element {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="space-y-3" padding="24px" hover={false}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("documents.security.architectureTitle")}
        </h3>
        <ul className="space-y-2">
          {controls.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border p-4"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {t(`documents.security.controls.${c.id}.title`)}
                </p>
                <Badge
                  tone={
                    c.status === "enabled" ? "positive" : c.status === "placeholder" ? "warning" : "default"
                  }
                >
                  {c.status === "enabled"
                    ? t("documents.security.enabled")
                    : c.status === "placeholder"
                      ? t("documents.security.placeholder")
                      : t("documents.security.notEnforced")}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t(`documents.security.controls.${c.id}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3" padding="24px" hover={false}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("documents.security.sharingTitle")}
        </h3>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("documents.security.sharingIntro")}
        </p>
        <ul className="space-y-2">
          {SHARE_SCOPES.map((scope) => (
            <li
              key={scope}
              className="flex items-center justify-between rounded-xl border px-3 py-2.5"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t(shareLabel(scope))}
              </span>
              <Badge tone={scope === "public_link" ? "warning" : "default"}>
                {scope === "public_link"
                  ? t("documents.security.placeholder")
                  : t("documents.security.modelOnly")}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

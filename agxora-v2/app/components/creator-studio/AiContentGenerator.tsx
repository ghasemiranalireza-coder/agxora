"use client";

import { useState, type JSX } from "react";
import type { BrandVoice, BrandVoiceOption, ContentFormat, ContentFormatOption } from "../../lib/creator-studio";
import { catalogCopy, useT } from "../../lib/i18n";
import { Badge, Button, Card } from "../ui";

export function AiContentGenerator({
  formats,
  voices,
}: {
  readonly formats: readonly ContentFormatOption[];
  readonly voices: readonly BrandVoiceOption[];
}): JSX.Element {
  const t = useT();
  const [format, setFormat] = useState<ContentFormat>("instagram_caption");
  const [voice, setVoice] = useState<BrandVoice>("professional");
  const [brief, setBrief] = useState("");
  const [output, setOutput] = useState(t("creator.generator.initialOutput"));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="space-y-4 xl:col-span-3" padding="24px">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("creator.generator.title")}
        </h3>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("creator.generator.lead")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {formats.map((item) => {
            const active = item.id === format;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormat(item.id)}
                className="rounded-2xl border p-3 text-left text-sm transition-opacity hover:opacity-90"
                style={{
                  borderColor: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                    : "var(--agx-card-border, rgba(255,255,255,0.1))",
                  background: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
                    : "rgba(255,255,255,0.02)",
                  color: "var(--agx-text, #f8fafc)",
                }}
              >
                <span className="font-medium">
                  {catalogCopy(t, `creator.formats.${item.id}`, item.label)}
                </span>
              </button>
            );
          })}
        </div>
        <label className="block space-y-1.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("creator.generator.brief")}
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            placeholder={t("creator.generator.briefPlaceholder")}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
              background: "rgba(255,255,255,0.04)",
              color: "var(--agx-text, #f8fafc)",
              resize: "vertical",
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() =>
              setOutput(
                t("creator.generator.draftStaged", {
                  format: catalogCopy(
                    t,
                    `creator.formats.${format}`,
                    formats.find((f) => f.id === format)?.label ?? format,
                  ),
                  voice: catalogCopy(t, `creator.voice.${voice}`, voice),
                }),
              )
            }
          >
            {t("creator.generator.generateDraft")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setOutput(t("creator.generator.rewriteQueued"))}
          >
            {t("creator.generator.aiRewrite")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOutput(t("creator.generator.translateQueued"))}
          >
            {t("creator.generator.translate")}
          </Button>
        </div>
        <div
          className="rounded-2xl border p-4 text-sm leading-relaxed"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
            background: "rgba(255,255,255,0.02)",
            color: "var(--agx-text-muted, #94a3b8)",
          }}
        >
          {output}
        </div>
      </Card>

      <Card className="space-y-3 xl:col-span-2" padding="24px">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("creator.generator.brandVoice")}
        </h3>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("creator.generator.brandVoiceLead")}
        </p>
        <ul className="space-y-2">
          {voices.map((item) => {
            const active = item.id === voice;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setVoice(item.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left"
                  style={{
                    borderColor: active
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                      : "var(--agx-card-border, rgba(255,255,255,0.08))",
                    background: active
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)"
                      : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                      {catalogCopy(t, `creator.voice.${item.id}`, item.label)}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {catalogCopy(t, `creator.voiceDesc.${item.id}`, item.description)}
                    </p>
                  </div>
                  {active ? <Badge tone="accent">{t("creator.generator.active")}</Badge> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

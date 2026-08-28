"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import {
  Badge,
  Button,
  Card,
  FormField,
  FormSelect,
  FormTextArea,
} from "@/app/components/ui";
import { catalogCopy, localizeThrownError, useT } from "@/app/lib/i18n";
import { growthService } from "../growth/service";
import { creativeService } from "../creative/service";
import {
  canRegenerateCompletedCreative,
  canRequestPaidGeneration,
  canRequestPublish,
} from "../creative/capabilities";
import {
  CREATIVE_PLATFORMS,
  CREATIVE_TYPES,
  type CreativePlatformId,
  type CreativeType,
} from "../creative/types";
import { operationsService } from "../execution/service";
import { useAgentOperatingSystem } from "../hooks";

export function CreativeWorkspace(): JSX.Element {
  const t = useT();
  const aos = useAgentOperatingSystem();
  const orgId = aos.organizationId;
  const profile = growthService.snapshot(orgId).profile;
  const [provider, setProvider] = useState(() => creativeService.providerStatus());
  const projects = aos.creativeProjects;
  const [notice, setNotice] = useState(t("agents.creative.noticeReady"));
  const [busy, setBusy] = useState(false);
  const [creativeType, setCreativeType] = useState<CreativeType>("IMAGE_AD");
  const [platform, setPlatform] =
    useState<CreativePlatformId>("instagram_feed");
  const [request, setRequest] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void creativeService.refreshProviderStatus().then(setProvider);
  }, []);

  const selected = useMemo(
    () => projects.find((item) => item.id === selectedId) ?? projects[0] ?? null,
    [projects, selectedId],
  );

  const paidGenerationSupported = selected
    ? canRequestPaidGeneration(selected)
    : canRequestPaidGeneration({
        creativeType,
        productionPlan: {
          summary: "",
          creativeType,
          platform,
          modality: creativeType === "IMAGE_AD" ? "image" : "video",
          estimatedDurationSeconds: 0,
          aspectRatio: "1:1",
          requiresExternalGeneration: true,
          checklist: [],
        },
      });
  const canRegenerateSelected = selected
    ? canRegenerateCompletedCreative(selected)
    : false;
  const canPublishSelected = selected ? canRequestPublish(selected) : false;

  const generatedAssets = (() => {
    if (selected?.productionResult?.generated !== true) return [];
    const preview = creativeService.getPreviewAssets(selected.id);
    if (preview.length > 0) {
      return preview.filter(
        (asset) => typeof asset.url === "string" && asset.url.length > 0,
      );
    }
    return (selected.productionResult.assets ?? []).filter(
      (asset) => typeof asset.url === "string" && asset.url.length > 0,
    );
  })();

  const run = async (action: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await action();
      setNotice(t(successKey));
      const nextProvider = await creativeService.refreshProviderStatus();
      setProvider(nextProvider);
    } catch (error) {
      setNotice(localizeThrownError(t, error, "agents.creative.noticeFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("agents.creative.title")}
        </h2>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.creative.subtitle")}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.creative.capabilityNotice")}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.creative.providerStatus", {
            id: provider.id,
            configured: provider.configured
              ? t("agents.creative.providerConfigured")
              : t("agents.creative.providerUnavailable"),
          })}
        </p>
        {!provider.configured ? (
          <p className="text-xs" style={{ color: "var(--agx-warning, #fbbf24)" }}>
            {t("agents.creative.providerNotConfiguredDetail")}
          </p>
        ) : null}
        {!profile ? (
          <p className="text-xs" style={{ color: "var(--agx-danger, #f87171)" }}>
            {t("agents.creative.profileRequired")}
          </p>
        ) : null}
        <FormField label={t("agents.creative.fields.type")}>
          <FormSelect
            value={creativeType}
            onChange={(e) => setCreativeType(e.target.value as CreativeType)}
          >
            {CREATIVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {catalogCopy(t, `agents.creative.types.${type}`, type)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label={t("agents.creative.fields.platform")}>
          <FormSelect
            value={platform}
            onChange={(e) => setPlatform(e.target.value as CreativePlatformId)}
          >
            {CREATIVE_PLATFORMS.map((item) => (
              <option key={item} value={item}>
                {catalogCopy(t, `agents.creative.platforms.${item}`, item)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label={t("agents.creative.fields.request")}>
          <FormTextArea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={4}
            placeholder={t("agents.creative.requestPlaceholder")}
          />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !profile}
            onClick={() =>
              void run(async () => {
                const project = creativeService.createBrief({
                  organizationId: orgId,
                  profileId: profile?.id,
                  creativeType,
                  platform,
                  customerRequest: request,
                });
                setSelectedId(project.id);
              }, "agents.creative.noticeBrief")
            }
          >
            {t("agents.creative.actions.createBrief")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !selected}
            onClick={() =>
              void run(async () => {
                if (!selected) return;
                creativeService.attachScript(orgId, selected.id);
                creativeService.attachStoryboard(orgId, selected.id);
                creativeService.prepareProductionPlan(orgId, selected.id);
              }, "agents.creative.noticePlan")
            }
          >
            {t("agents.creative.actions.preparePlan")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !selected || !paidGenerationSupported}
            onClick={() =>
              void run(async () => {
                if (!selected) return;
                const { job } = await creativeService.requestProduction(
                  orgId,
                  selected.id,
                );
                await operationsService.start(orgId, job.id, aos.userId ?? "operator");
              }, "agents.creative.noticeQueued")
            }
          >
            {t("agents.creative.actions.requestProduction")}
          </Button>
          {canRegenerateSelected ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!selected) return;
                  const { job } = await creativeService.requestRegenerateProduction(
                    orgId,
                    selected.id,
                  );
                  await operationsService.start(orgId, job.id, aos.userId ?? "operator");
                }, "agents.creative.noticeRegenerateQueued")
              }
            >
              {t("agents.creative.actions.regenerateMedia")}
            </Button>
          ) : null}
          {canPublishSelected ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!selected) return;
                  const { job } = await creativeService.requestPublish(
                    orgId,
                    selected.id,
                  );
                  await operationsService.start(orgId, job.id, aos.userId ?? "operator");
                }, "agents.creative.noticePublishQueued")
              }
            >
              {t("agents.creative.actions.requestPublish")}
            </Button>
          ) : null}
        </div>
        {!paidGenerationSupported && selected?.productionPlan ? (
          <p className="text-xs" style={{ color: "var(--agx-warning, #fbbf24)" }}>
            {t("agents.creative.detail.unsupportedPaidGeneration")}
          </p>
        ) : null}
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("agents.creative.projectsTitle")}
        </h2>
        {projects.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.creative.empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border px-3 py-2 text-left text-xs"
                  style={{
                    borderColor:
                      selected?.id === project.id
                        ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)"
                        : "color-mix(in srgb, var(--agx-text-muted, #94a3b8) 25%, transparent)",
                    color: "var(--agx-text, #f8fafc)",
                  }}
                  onClick={() => setSelectedId(project.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{project.name}</span>
                    <Badge>
                      {catalogCopy(
                        t,
                        `agents.creative.status.${project.status}`,
                        project.status,
                      )}
                    </Badge>
                  </div>
                  <div style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {catalogCopy(
                      t,
                      `agents.creative.types.${project.creativeType}`,
                      project.creativeType,
                    )}{" "}
                    ·{" "}
                    {catalogCopy(
                      t,
                      `agents.creative.platforms.${project.platform}`,
                      project.platform,
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected ? (
          <div className="space-y-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            <p>
              <strong style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t("agents.creative.detail.brief")}
              </strong>
              : {selected.brief.customerRequest}
            </p>
            <p>
              {t("agents.creative.detail.concepts", {
                count: selected.concepts.length,
              })}
            </p>
            <p>
              {t("agents.creative.detail.scriptScenes", {
                count: selected.script?.scenes.length ?? 0,
              })}
            </p>
            <p>
              {t("agents.creative.detail.storyboardFrames", {
                count: selected.storyboard?.frames.length ?? 0,
              })}
            </p>
            {selected.productionResult ? (
              <p>
                {t("agents.creative.detail.result", {
                  status: selected.productionResult.status,
                  reason: selected.productionResult.reason ?? "",
                  generated: selected.productionResult.generated
                    ? t("agents.creative.yes")
                    : t("agents.creative.no"),
                })}
              </p>
            ) : null}

            {selected.productionResult?.status === "unavailable" ? (
              <p style={{ color: "var(--agx-warning, #fbbf24)" }}>
                {t("agents.creative.detail.unavailableHint")}
              </p>
            ) : null}

            {selected.productionResult?.status === "failed" ? (
              <p style={{ color: "var(--agx-danger, #f87171)" }}>
                {t("agents.creative.detail.failedHint")}
              </p>
            ) : null}

            {selected.publishResult ? (
              <p>
                {t("agents.creative.detail.publishResult", {
                  status: selected.publishResult.status,
                  reason: selected.publishResult.reason ?? "",
                  published: selected.publishResult.published
                    ? t("agents.creative.yes")
                    : t("agents.creative.no"),
                })}
              </p>
            ) : null}

            {selected.publishResult?.status === "uploading" ? (
              <p style={{ color: "var(--agx-warning, #fbbf24)" }}>
                {t("agents.creative.detail.publishUploadingHint")}
                {typeof selected.publishResult.uploadByteSize === "number" &&
                selected.publishResult.uploadByteSize > 0 &&
                typeof selected.publishResult.uploadByteOffset === "number" ? (
                  <>
                    {" "}
                    {t("agents.creative.detail.publishUploadingProgress", {
                      percent: Math.min(
                        100,
                        Math.round(
                          (selected.publishResult.uploadByteOffset /
                            selected.publishResult.uploadByteSize) *
                            100,
                        ),
                      ),
                    })}
                  </>
                ) : null}
              </p>
            ) : null}

            {selected.publishResult?.status === "unavailable" ? (
              <p style={{ color: "var(--agx-warning, #fbbf24)" }}>
                {t("agents.creative.detail.publishUnavailableHint")}
              </p>
            ) : null}

            {selected.publishResult?.status === "failed" ? (
              <p style={{ color: "var(--agx-danger, #f87171)" }}>
                {t("agents.creative.detail.publishFailedHint")}
              </p>
            ) : null}

            {generatedAssets.length > 0 ? (
              <div className="space-y-2">
                <p style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {t("agents.creative.detail.generatedAssets", {
                    count: generatedAssets.length,
                    provider: selected.productionResult?.providerId ?? "",
                  })}
                </p>
                {generatedAssets.map((asset, index) => {
                  const showVideo = asset.mimeType?.startsWith("video/") === true;
                  return (
                  <div
                    key={`${asset.providerAssetId ?? asset.url}-${index}`}
                    className="space-y-2 rounded-md border px-2 py-2"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--agx-text-muted, #94a3b8) 25%, transparent)",
                    }}
                  >
                    {showVideo ? (
                      <video
                        src={asset.url}
                        controls
                        className="max-h-64 w-full rounded object-contain"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={asset.url}
                        alt={t("agents.creative.detail.assetAlt", {
                          index: index + 1,
                        })}
                        className="max-h-64 w-full rounded object-contain"
                      />
                    )}
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      download={
                        asset.mimeType?.startsWith("image/")
                          ? `agxora-creative-${index + 1}`
                          : asset.mimeType?.startsWith("video/")
                            ? `agxora-creative-${index + 1}.mp4`
                            : undefined
                      }
                      className="inline-flex text-xs underline"
                      style={{ color: "var(--agx-accent, #22d3ee)" }}
                    >
                      {t("agents.creative.detail.openAsset")}
                    </a>
                  </div>
                  );
                })}
              </div>
            ) : null}

            {selected.script ? (
              <p
                className="whitespace-pre-wrap rounded-md border px-2 py-2"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--agx-text-muted, #94a3b8) 25%, transparent)",
                }}
              >
                {selected.script.voiceOver}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

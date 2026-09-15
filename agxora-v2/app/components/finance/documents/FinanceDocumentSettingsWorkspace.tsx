"use client";

import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { useLocale } from "../../../lib/i18n";
import {
  FINANCE_DOCUMENT_TEMPLATES,
  financeLogoUrl,
  type FinanceBrandingView,
  type FinanceDocumentSettingsView,
  type FinanceDocumentTemplate,
  type FinanceQrSettingsView,
} from "../../../lib/finance/documents/types";
import { FINANCE_QR_POSITIONS, buildPaymentQrSnapshot, emptyQrSettings } from "../../../lib/finance/documents/epcQr";
import { Button, Card, Checkbox, ErrorState, FormField, FormInput, FormSelect, Switch } from "../../ui";
import { DocumentRenderer } from "./DocumentRenderer";
import { sampleDeliveryNote, sampleInvoice } from "./sampleData";
import "./document.css";

type PreviewKind = "INVOICE" | "DELIVERY_NOTE";

async function fetchSettings(): Promise<FinanceDocumentSettingsView> {
  const response = await fetch("/api/v1/finance/document-settings", { credentials: "include" });
  const body = (await response.json()) as { ok?: boolean; settings?: FinanceDocumentSettingsView; message?: string };
  if (!response.ok || !body.settings) {
    throw new Error(body.message ?? "Could not load document settings");
  }
  return body.settings;
}

export function FinanceDocumentSettingsWorkspace(): JSX.Element {
  const { t } = useLocale();
  const [settings, setSettings] = useState<FinanceDocumentSettingsView | null>(null);
  const [draft, setDraft] = useState<FinanceBrandingView | null>(null);
  const [invoiceTemplate, setInvoiceTemplate] = useState<FinanceDocumentTemplate>("CLASSIC");
  const [deliveryTemplate, setDeliveryTemplate] = useState<FinanceDocumentTemplate>("CLASSIC");
  const [qr, setQr] = useState<FinanceQrSettingsView>(emptyQrSettings());
  const [previewKind, setPreviewKind] = useState<PreviewKind>("INVOICE");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);

  const load = useCallback(async () => {
    const next = await fetchSettings();
    setSettings(next);
    setDraft(next.branding);
    setInvoiceTemplate(next.invoiceTemplate);
    setDeliveryTemplate(next.deliveryNoteTemplate);
    setQr(next.qr ?? emptyQrSettings());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("finance.documents.errors.load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  const branding = draft ?? settings?.branding;
  const previewModel = useMemo(() => {
    if (!branding) return null;
    if (previewKind !== "INVOICE") return sampleDeliveryNote(branding);
    const payment = buildPaymentQrSnapshot(qr, branding, {
      amount: "3220.05",
      currency: "EUR",
      invoiceNumber: "RE-2026-000001",
      customerName: "Hanseatische Handels GmbH",
    });
    return sampleInvoice(branding, payment);
  }, [branding, previewKind, qr]);
  const activeTemplate = previewKind === "INVOICE" ? invoiceTemplate : deliveryTemplate;

  async function save(): Promise<void> {
    if (!draft) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/finance/document-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceTemplate,
          deliveryNoteTemplate: deliveryTemplate,
          qrEnabled: qr.enabled,
          qrPosition: qr.position,
          qrIncludeAmount: qr.includeAmount,
          qrIncludeInvoiceNumber: qr.includeInvoiceNumber,
          qrIncludeCustomerName: qr.includeCustomerName,
          qrRemittanceText: qr.remittanceText,
          ...draft,
        }),
      });
      const body = (await response.json()) as { ok?: boolean; settings?: FinanceDocumentSettingsView; message?: string; code?: string };
      if (response.status === 403) {
        setCanEdit(false);
        throw new Error(t("finance.documents.errors.forbidden"));
      }
      if (!response.ok || !body.settings) {
        throw new Error(body.message ?? t("finance.documents.errors.save"));
      }
      setSettings(body.settings);
      setDraft(body.settings.branding);
      setInvoiceTemplate(body.settings.invoiceTemplate);
      setDeliveryTemplate(body.settings.deliveryNoteTemplate);
      setQr(body.settings.qr ?? emptyQrSettings());
      setNotice(t("finance.documents.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.documents.errors.save"));
    } finally {
      setBusy(false);
    }
  }

  async function onLogo(file: File | null): Promise<void> {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("logo", file);
      const response = await fetch("/api/v1/finance/document-settings/logo", {
        method: "POST",
        credentials: "include",
        body: data,
      });
      const body = (await response.json()) as { settings?: FinanceDocumentSettingsView; message?: string };
      if (response.status === 403) {
        setCanEdit(false);
        throw new Error(t("finance.documents.errors.forbidden"));
      }
      if (!response.ok || !body.settings) {
        throw new Error(body.message ?? t("finance.documents.errors.logo"));
      }
      setSettings(body.settings);
      setDraft(body.settings.branding);
      setNotice(t("finance.documents.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.documents.errors.logo"));
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/finance/document-settings/logo", {
        method: "DELETE",
        credentials: "include",
      });
      const body = (await response.json()) as { settings?: FinanceDocumentSettingsView; message?: string };
      if (response.status === 403) {
        setCanEdit(false);
        throw new Error(t("finance.documents.errors.forbidden"));
      }
      if (!response.ok || !body.settings) {
        throw new Error(body.message ?? t("finance.documents.errors.logo"));
      }
      setSettings(body.settings);
      setDraft(body.settings.branding);
      setNotice(t("finance.documents.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.documents.errors.logo"));
    } finally {
      setBusy(false);
    }
  }

  function field(key: keyof FinanceBrandingView, label: string): JSX.Element {
    if (key === "logoId" || key === "primaryColor" || key === "secondaryColor") {
      return <></>;
    }
    return (
      <FormField label={label}>
        <FormInput
          value={draft?.[key] ?? ""}
          disabled={!canEdit || busy}
          onChange={(event) =>
            setDraft((current) =>
              current ? { ...current, [key]: event.target.value } : current,
            )
          }
        />
      </FormField>
    );
  }

  return (
    <div className="min-w-0">
      {error ? <ErrorState title={t("finance.documents.errors.load")} description={error} /> : null}
      {notice ? (
        <p role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
      {loading || !draft || !previewModel ? (
        <Card padding="18px">{t("finance.core.loading")}</Card>
      ) : (
        <div className="agx-doc-settings">
          <div className="space-y-5">
            <Card className="space-y-3" padding="18px">
              <h2 className="text-lg font-semibold">{t("finance.documents.company")}</h2>
              <div className="agx-doc-formgrid">
                {field("companyName", t("finance.documents.fields.companyName"))}
                {field("street", t("finance.documents.fields.street"))}
                {field("postalCode", t("finance.documents.fields.postalCode"))}
                {field("city", t("finance.documents.fields.city"))}
                {field("country", t("finance.documents.fields.country"))}
                {field("phone", t("finance.documents.fields.phone"))}
                {field("email", t("finance.documents.fields.email"))}
                {field("website", t("finance.documents.fields.website"))}
                {field("vatId", t("finance.documents.fields.vatId"))}
                {field("taxNumber", t("finance.documents.fields.taxNumber"))}
                {field("iban", t("finance.documents.fields.iban"))}
                {field("bic", t("finance.documents.fields.bic"))}
                {field("commercialRegister", t("finance.documents.fields.commercialRegister"))}
                {field("managingDirector", t("finance.documents.fields.managingDirector"))}
              </div>
            </Card>

            <Card className="space-y-3" padding="18px">
              <h2 className="text-lg font-semibold">{t("finance.documents.logoBranding")}</h2>
              <div className="agx-finance-actions">
                {draft.logoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="agx-doc-logo-preview" src={financeLogoUrl(draft.logoId) ?? ""} alt="" />
                ) : (
                  <p>{t("finance.documents.noLogo")}</p>
                )}
                <label className="agx-ui-btn">
                  {t("finance.documents.uploadLogo")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    disabled={!canEdit || busy}
                    onChange={(event) => void onLogo(event.target.files?.[0] ?? null)}
                  />
                </label>
                <Button disabled={!draft.logoId || busy || !canEdit} onClick={() => void removeLogo()}>
                  {t("finance.documents.removeLogo")}
                </Button>
              </div>
              <div className="agx-doc-formgrid">
                <FormField label={t("finance.documents.fields.primaryColor")}>
                  <FormInput
                    type="color"
                    value={draft.primaryColor.toLowerCase()}
                    disabled={!canEdit || busy}
                    onChange={(event) => setDraft({ ...draft, primaryColor: event.target.value.toUpperCase() })}
                  />
                </FormField>
                <FormField label={t("finance.documents.fields.secondaryColor")}>
                  <FormInput
                    type="color"
                    value={draft.secondaryColor.toLowerCase()}
                    disabled={!canEdit || busy}
                    onChange={(event) => setDraft({ ...draft, secondaryColor: event.target.value.toUpperCase() })}
                  />
                </FormField>
              </div>
            </Card>

            <Card className="space-y-3" padding="18px">
              <h2 className="text-lg font-semibold">{t("finance.documents.qr.title")}</h2>
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("finance.documents.qr.subtitle")}
              </p>
              <Switch
                label={t("finance.documents.qr.enabled")}
                description={t("finance.documents.qr.enabledHint")}
                checked={qr.enabled}
                disabled={!canEdit || busy}
                onChange={(enabled) => setQr((current) => ({ ...current, enabled }))}
              />
              <FormField label={t("finance.documents.qr.position")}>
                <FormSelect
                  value={qr.position}
                  disabled={!canEdit || busy || !qr.enabled}
                  onChange={(event) =>
                    setQr((current) => ({
                      ...current,
                      position: event.target.value as FinanceQrSettingsView["position"],
                    }))
                  }
                >
                  {FINANCE_QR_POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {t(`finance.documents.qr.positions.${position}`)}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <Checkbox
                label={t("finance.documents.qr.includeAmount")}
                checked={qr.includeAmount}
                disabled={!canEdit || busy || !qr.enabled}
                onChange={(includeAmount) => setQr((current) => ({ ...current, includeAmount }))}
              />
              <Checkbox
                label={t("finance.documents.qr.includeInvoiceNumber")}
                checked={qr.includeInvoiceNumber}
                disabled={!canEdit || busy || !qr.enabled}
                onChange={(includeInvoiceNumber) =>
                  setQr((current) => ({ ...current, includeInvoiceNumber }))
                }
              />
              <Checkbox
                label={t("finance.documents.qr.includeCustomerName")}
                checked={qr.includeCustomerName}
                disabled={!canEdit || busy || !qr.enabled}
                onChange={(includeCustomerName) =>
                  setQr((current) => ({ ...current, includeCustomerName }))
                }
              />
              <FormField label={t("finance.documents.qr.remittance")}>
                <FormInput
                  value={qr.remittanceText}
                  disabled={!canEdit || busy || !qr.enabled}
                  maxLength={140}
                  onChange={(event) =>
                    setQr((current) => ({ ...current, remittanceText: event.target.value }))
                  }
                />
              </FormField>
            </Card>

            <Card className="space-y-3" padding="18px">
              <h2 className="text-lg font-semibold">{t("finance.documents.deliveryDesign")}</h2>
              <TemplatePicker
                value={deliveryTemplate}
                branding={draft}
                kind="DELIVERY_NOTE"
                disabled={!canEdit}
                onChange={setDeliveryTemplate}
              />
            </Card>

            <Card className="space-y-3" padding="18px">
              <h2 className="text-lg font-semibold">{t("finance.documents.invoiceDesign")}</h2>
              <TemplatePicker
                value={invoiceTemplate}
                branding={draft}
                kind="INVOICE"
                disabled={!canEdit}
                onChange={setInvoiceTemplate}
              />
            </Card>

            <div className="agx-finance-actions">
              <Button variant="primary" disabled={busy || !canEdit} onClick={() => void save()}>
                {busy ? t("finance.documents.saving") : t("finance.documents.save")}
              </Button>
            </div>
          </div>

          <Card className="space-y-3" padding="18px">
            <h2 className="text-lg font-semibold">{t("finance.documents.preview")}</h2>
            <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("finance.documents.previewHint")}
            </p>
            <div className="agx-finance-actions">
              <Button
                variant={previewKind === "DELIVERY_NOTE" ? "primary" : "secondary"}
                onClick={() => setPreviewKind("DELIVERY_NOTE")}
              >
                {t("finance.documents.deliveryNote")}
              </Button>
              <Button
                variant={previewKind === "INVOICE" ? "primary" : "secondary"}
                onClick={() => setPreviewKind("INVOICE")}
              >
                {t("finance.documents.invoice")}
              </Button>
            </div>
            <DocumentRenderer model={previewModel} template={activeTemplate} />
          </Card>
        </div>
      )}
    </div>
  );
}

function TemplatePicker({
  value,
  branding,
  kind,
  disabled,
  onChange,
}: {
  readonly value: FinanceDocumentTemplate;
  readonly branding: FinanceBrandingView;
  readonly kind: PreviewKind;
  readonly disabled: boolean;
  readonly onChange: (next: FinanceDocumentTemplate) => void;
}): JSX.Element {
  const { t } = useLocale();
  const model = kind === "INVOICE" ? sampleInvoice(branding) : sampleDeliveryNote(branding);
  return (
    <div className="agx-doc-templates">
      {FINANCE_DOCUMENT_TEMPLATES.map((template) => (
        <button
          key={template}
          type="button"
          className={`agx-doc-card${template === value ? " is-selected" : ""}`}
          onClick={() => onChange(template)}
          aria-pressed={template === value}
          disabled={disabled}
        >
          <strong>{t(`finance.documents.templates.${template}`)}</strong>
          <DocumentRenderer model={model} template={template} mode="thumb" />
        </button>
      ))}
    </div>
  );
}

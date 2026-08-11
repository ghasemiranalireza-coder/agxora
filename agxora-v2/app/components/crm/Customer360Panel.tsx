"use client";

import { useState, type JSX } from "react";
import type { Customer360 } from "../../lib/crm";
import { formatDate, formatDateTime, formatMoney } from "../../lib/crm";
import { useLocale } from "../../lib/i18n";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

const TAB_KEYS = [
  "profile",
  "company",
  "contacts",
  "orders",
  "invoices",
  "lieferscheine",
  "payments",
  "documents",
  "timeline",
  "activities",
  "notes",
  "aiSummary",
  "communicationHistory",
] as const;

type TabKey = (typeof TAB_KEYS)[number];

export function Customer360Panel({
  customer,
}: {
  readonly customer: Customer360;
}): JSX.Element {
  const { t } = useLocale();
  const [tab, setTab] = useState<TabKey>("profile");
  const statusDisplay =
    customer.status === "active"
      ? t("crm.status.active")
      : customer.status === "prospect"
        ? t("crm.status.prospect")
        : customer.status === "churn_risk"
          ? t("crm.customer360.status.churn_risk")
          : customer.status;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <CrmGlassCard className="xl:col-span-4" padding="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {customer.name}
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {customer.company.name}
            </p>
          </div>
          <CrmBadge tone={customer.status === "active" ? "positive" : "warning"}>
            {statusDisplay}
          </CrmBadge>
        </div>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("crm.customer360.email")}
            </dt>
            <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{customer.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("crm.customer360.phone")}
            </dt>
            <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{customer.phone}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("crm.customer360.aiHealth")}
            </dt>
            <dd className="font-semibold tabular-nums" style={{ color: "var(--agx-accent, #22d3ee)" }}>
              {t("crm.kpi.scoreOutOf", {
                score: customer.healthScore,
                max: 100,
              })}
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {customer.aiSummary}
        </p>
      </CrmGlassCard>

      <CrmGlassCard className="xl:col-span-8" padding="p-5">
        <div
          className="mb-4 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label={t("crm.customer360.ariaSections")}
        >
          {TAB_KEYS.map((key) => {
            const active = key === tab;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                    : "var(--agx-card-border, rgba(255,255,255,0.1))",
                  background: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)"
                    : "transparent",
                  color: active
                    ? "var(--agx-accent, #22d3ee)"
                    : "var(--agx-text-muted, #94a3b8)",
                }}
              >
                {t(`crm.customer360.tabs.${key}`)}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="min-h-[220px] text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {tab === "profile" && (
            <ul className="space-y-2">
              <li>
                {t("crm.customer360.profileLines.customerId")}: {customer.id}
              </li>
              <li>
                {t("crm.customer360.profileLines.status")}: {customer.status}
              </li>
              <li>
                {t("crm.customer360.profileLines.primaryContact")}: {customer.name}
              </li>
            </ul>
          )}
          {tab === "company" && (
            <ul className="space-y-2">
              <li>{customer.company.name}</li>
              <li>
                {customer.company.industry} · {customer.company.city}, {customer.company.country}
              </li>
              <li>{customer.company.website}</li>
            </ul>
          )}
          {tab === "contacts" && (
            <ul className="space-y-3">
              {customer.contacts.map((c) => (
                <li key={c.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}>
                  <p className="font-medium">{c.name}</p>
                  <p style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {c.role} · {c.email} · {c.phone}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {tab === "orders" && <ChipList items={customer.orders} />}
          {tab === "invoices" && <ChipList items={customer.invoices} />}
          {tab === "lieferscheine" && <ChipList items={customer.lieferscheine} />}
          {tab === "payments" && (
            <ul className="space-y-2">
              {customer.payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span>{formatDate(p.at)} · {p.status}</span>
                  <span className="tabular-nums">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {tab === "documents" && <ChipList items={customer.documents} />}
          {tab === "timeline" && (
            <ul className="space-y-3">
              {customer.timeline.map((e) => (
                <li key={e.id}>
                  <p className="font-medium">{e.title}</p>
                  <p style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {formatDateTime(e.at)} · {e.detail}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {tab === "activities" && (
            <ul className="space-y-3">
              {customer.activities.map((a) => (
                <li key={a.id}>
                  <p className="font-medium">{a.kind}</p>
                  <p style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {formatDateTime(a.at)} · {a.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {tab === "notes" && (
            <ul className="space-y-3">
              {customer.notes.map((n) => (
                <li key={n.id}>
                  <p className="font-medium">{n.author}</p>
                  <p style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {formatDateTime(n.at)} · {n.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {tab === "aiSummary" && (
            <p className="leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {customer.aiSummary}
            </p>
          )}
          {tab === "communicationHistory" && (
            <ul className="space-y-3">
              {customer.communicationHistory.map((c) => (
                <li key={c.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <CrmBadge tone="accent">{c.channel}</CrmBadge>
                    <CrmBadge>{c.direction}</CrmBadge>
                    <span className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {formatDateTime(c.at)}
                    </span>
                  </div>
                  <p className="mt-2 font-medium">{c.subject}</p>
                  <p style={{ color: "var(--agx-text-muted, #94a3b8)" }}>{c.preview}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CrmGlassCard>
    </div>
  );
}

function ChipList({ items }: { readonly items: readonly string[] }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <CrmBadge key={item} tone="accent">
          {item}
        </CrmBadge>
      ))}
    </div>
  );
}

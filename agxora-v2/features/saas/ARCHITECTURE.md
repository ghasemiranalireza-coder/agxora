# AGXORA Commercial SaaS Platform — Phase 24

## Architecture

```
features/saas/
  plans/           # Starter · Professional · Business · Enterprise
  license/         # trial · active · expired · cancelled · suspended · lifetime
  gating/          # Plan → module feature flags
  usage/           # Metrics + quota checks (advisory enforcement)
  billing/         # Invoices, checkout, renewals, coupons, refunds placeholder
  payments/        # Stripe · PayPal · Bank Transfer · Manual providers
  email/           # Template + mock delivery queue
  notifications/   # Trial ending, expiry, payment failed, upgrades, quotas
  store/           # LocalStorage commercial state (API-ready)
  hooks/           # useSaasCommercial
  components/      # Customer portal + Admin panel + Account billing section
  sales/           # Enterprise contact inquiries (local)
```

UI never imports payment SDKs. All commercial operations go through `billingService`.

## Plans

| Plan | Highlights |
|------|------------|
| Starter | CRM, Projects, Documents, AI |
| Professional | + Finance, Analytics, API |
| Business | + Automation, audit export, priority support |
| Enterprise | + SSO, branding, scale limits |

Public marketing pricing focuses on **Starter · Professional · Enterprise**.

Limits cover users, projects, customers, documents, storage, AI requests, API requests.

## Routes

- `/pricing` — public pricing (monthly / yearly)
- `/contact-sales` — enterprise inquiry
- `/dashboard/billing` — customer portal (upgrade / downgrade / cancel / renew)
- `/dashboard/billing/admin` — internal admin
- Settings → Billing — account billing summary

## Future integrations

1. **Stripe** — replace `StripePaymentProvider.createCheckoutSession` with Checkout Sessions + webhooks; keep UI unchanged.
2. **PayPal** — same provider interface.
3. **Invoice engine** — PDF generation from `BillingInvoice` records; email via `sendBillingEmail("invoice")`.
4. **Quota enforcement** — flip `assertQuota` to hard-block when product policy requires it.

## Compatibility

Dashboard shell (layout, sidebar, header, hero, globe, theme, navigation) is unchanged. Existing `app/lib/saas/subscription.ts` remains for legacy callers; commercial catalog is the source of truth for selling AGXORA.

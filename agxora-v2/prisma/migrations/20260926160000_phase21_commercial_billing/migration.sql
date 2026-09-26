-- Phase 21: commercial SaaS billing. Additive only.
-- Does not alter Finance invoice, delivery note, VAT, or SEPA tables.

CREATE TYPE "CommercialSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
CREATE TYPE "CommercialBillingInterval" AS ENUM ('month', 'year');
CREATE TYPE "CommercialCheckoutStatus" AS ENUM ('OPEN', 'COMPLETED', 'EXPIRED');
CREATE TYPE "CommercialBillingEventStatus" AS ENUM ('PROCESSED', 'IGNORED', 'FAILED');

CREATE TABLE "commercial_subscriptions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planCode" TEXT NOT NULL,
    "status" "CommercialSubscriptionStatus" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "interval" "CommercialBillingInterval" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerCustomerId" TEXT NOT NULL,
    "providerSubscriptionId" TEXT NOT NULL,
    "providerEventCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_subscriptions_organizationId_key" ON "commercial_subscriptions"("organizationId");
CREATE UNIQUE INDEX "commercial_subscriptions_provider_providerCustomerId_key" ON "commercial_subscriptions"("provider", "providerCustomerId");
CREATE UNIQUE INDEX "commercial_subscriptions_provider_providerSubscriptionId_key" ON "commercial_subscriptions"("provider", "providerSubscriptionId");
CREATE INDEX "commercial_subscriptions_status_idx" ON "commercial_subscriptions"("status");

ALTER TABLE "commercial_subscriptions" ADD CONSTRAINT "commercial_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "commercial_checkouts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planCode" TEXT NOT NULL,
    "interval" "CommercialBillingInterval" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerSessionId" TEXT NOT NULL,
    "providerCustomerId" TEXT NOT NULL,
    "status" "CommercialCheckoutStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_checkouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_checkouts_providerSessionId_key" ON "commercial_checkouts"("providerSessionId");
CREATE INDEX "commercial_checkouts_organizationId_status_idx" ON "commercial_checkouts"("organizationId", "status");
CREATE INDEX "commercial_checkouts_providerCustomerId_idx" ON "commercial_checkouts"("providerCustomerId");

ALTER TABLE "commercial_checkouts" ADD CONSTRAINT "commercial_checkouts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "commercial_billing_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "organizationId" UUID,
    "eventType" TEXT NOT NULL,
    "eventCreatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" "CommercialBillingEventStatus" NOT NULL,
    "safePayload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_billing_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_billing_events_provider_providerEventId_key" ON "commercial_billing_events"("provider", "providerEventId");
CREATE INDEX "commercial_billing_events_organizationId_createdAt_idx" ON "commercial_billing_events"("organizationId", "createdAt");
CREATE INDEX "commercial_billing_events_eventType_idx" ON "commercial_billing_events"("eventType");

ALTER TABLE "commercial_billing_events" ADD CONSTRAINT "commercial_billing_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

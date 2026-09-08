-- Phase 3C — official Amazon Selling Partner API (seller read-only).
-- Additive only: reuse encrypted social_platform_credentials + IntegrationConnection.

ALTER TYPE "IntegrationProvider" ADD VALUE 'amazon_seller';
ALTER TYPE "SocialPlatform" ADD VALUE 'amazon';

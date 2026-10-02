-- Phase 28 — one Instagram professional account per organization.
-- Reuses social_platform_credentials and social_oauth_states.
-- Adds the enum value only. No token columns and no second credential table.

ALTER TYPE "SocialPlatform" ADD VALUE 'instagram';

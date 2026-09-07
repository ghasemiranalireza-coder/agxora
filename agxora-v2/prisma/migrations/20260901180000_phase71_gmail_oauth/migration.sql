-- Phase 71 — official Gmail / Google Workspace OAuth.
-- Additive only: extends SocialPlatform so encrypted Gmail credentials
-- reuse social_platform_credentials + social_oauth_states.
-- Do not run this migration against Production until Phase 2 is approved for deploy.

ALTER TYPE "SocialPlatform" ADD VALUE 'gmail';

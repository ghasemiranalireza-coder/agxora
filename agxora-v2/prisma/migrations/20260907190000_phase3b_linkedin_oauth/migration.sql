-- Phase 3B — official LinkedIn OAuth.
-- Additive only: extends SocialPlatform so encrypted LinkedIn credentials
-- reuse social_platform_credentials + social_oauth_states.

ALTER TYPE "SocialPlatform" ADD VALUE 'linkedin';

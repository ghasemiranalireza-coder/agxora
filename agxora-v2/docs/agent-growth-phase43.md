# AGXORA AI — Phase 43.0 Growth Agent Foundation

## Purpose

Phase 43.0 adds the first AGXORA AI Growth vertical on top of the Phase 42
Agent Operating System:

Business profile → growth strategy → website structure/preview → social
strategy → calendar → content → approval → publishing attempt.

This is a foundation phase. It does **not** provide live website hosting,
social OAuth, social publishing, scheduling, analytics, or a production CMS.

## Architecture

The existing Agent OS remains the execution runtime:

- `AgentTask`, `AgentExecution`, `AgentPlan`, `PlanStep`
- `AgentApproval`, `StepExecution`
- `agentOsService.enqueueTask()` / `resolveApproval()`
- `assertToolAllowed()` / `assertWorkspaceIsolation()`
- local persistence key `agxora-agent-os-v1`

Growth orchestration lives in `features/agents/growth/service.ts` and **calls**
Agent OS. It does not implement a second execution engine.

## GrowthBusinessProfile

`GrowthBusinessProfile` is an Agent OS domain type. It is **not** a replacement
for `app/lib/business/BusinessProfile.ts`.

When a Business OS profile exists, growth fields such as company name, industry,
services, products, language, and country can be seeded from it. Brand tone,
website goals, social goals, and preferred platforms remain in the Growth
domain.

## Website Agent

- Agent id: `website_builder`
- Tool `website`: deterministic structured site generation, no approval
- Tool `website_publish`: `requiresApproval: true`, uses `WebsitePublisherAdapter`

Generated output is a `WebsiteProject` with pages and sections. Minimum pages:

- Home
- About
- Services
- Contact

Lifecycle: `DRAFT → GENERATING → PREVIEW → NEEDS_CHANGES → READY → APPROVED → PUBLISHED → FAILED`

`PUBLISHED` is allowed only when `WebsitePublisherAdapter.publish()` returns a
real successful result (`available: true`, `published: true`, `status: "published"`).

The Phase 43 publisher is unavailable. Publish attempts therefore remain in a
safe preview/ready/approved state and surface “Publishing integration not configured”.

## Social Agent

- Agent id: `social_media`
- Tool `social`: strategy, calendar, and draft content (no approval)
- Tools `social_publish` / `social_schedule`: `requiresApproval: true`

Platforms: Instagram, Facebook, TikTok, LinkedIn, YouTube.

Content types now: `POST`, `STORY`. The model also allows future `REEL`,
`VIDEO`, `CAROUSEL`, `SHORT`, `ARTICLE`.

`SocialAccount` records are metadata-only and stay `DISCONNECTED`. No OAuth
tokens, access tokens, or secrets are stored.

`SocialPlatformAdapter` methods all return `{ available: false, status: "unavailable", published: false }` unless a later phase registers a real adapter.

## Approval flow

Generation does not require approval.

External side effects do:

1. Generate
2. Review
3. `WAITING_FOR_APPROVAL`
4. Approve or reject using existing `AgentApproval`
5. On approve, attempt the adapter
6. If the adapter is unavailable, record the attempt and **do not** mark `PUBLISHED`

Rejected items become `NEEDS_CHANGES` / `BLOCKED` and cannot be published.

## Persistence

Agent OS state version is now `3`. `normalizeState()` upgrades version-2
payloads by filling:

- `growthProfiles`
- `growthStrategies`
- `websiteProjects`
- `socialAccounts`
- `socialStrategies`
- `socialCalendars`
- `socialContent`
- `publishingJobs`

## API

Existing `/agents` dispatch handlers were extended:

- `GET/POST /agents/growth/business-profile`
- `POST /agents/growth/website/generate`
- `GET /agents/growth/website/projects`
- `GET /agents/growth/website/projects/:id`
- `POST /agents/growth/social/strategy`
- `POST /agents/growth/social/calendar`
- `GET /agents/growth/social/calendar`
- `POST /agents/growth/content/generate`
- reused `POST /agents/approvals/resolve`

## UI

The experience stays on `/dashboard/agents`. New Agent OS tabs:

- Growth
- Website Builder
- Social Media

The website preview is labeled **PREVIEW** and is not a production site.

## Security boundaries

- No social tokens in localStorage, UI, audit logs, or tool payloads
- Publish/schedule tools require approval
- Adapters never fake success
- Creator Studio and Integration Center OAuth are unchanged

## Explicit limitations

Phase 43 does **not** provide:

- real social OAuth
- real social publishing
- real scheduling
- real analytics
- production CMS / drag-and-drop editor
- fake publishing success
- live LLM website generation

## Future integration points

Later phases can replace:

- `WebsitePublisherAdapter`
- `SocialPlatformAdapter` implementations
- the deterministic generators with an LLM provider

without rewriting Agent OS.

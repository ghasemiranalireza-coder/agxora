# AGXORA AI — Phase 44.0 Growth Intelligence & Campaign Operations

## Purpose

Phase 44.0 adds the campaign operating layer on top of Phase 42 Agent OS and
Phase 43 Growth:

PROFILE → GROWTH STRATEGY → WEBSITE + SOCIAL FOUNDATION → CAMPAIGN PLANNING →
CONTENT/CAMPAIGN OPERATIONS → APPROVAL → EXECUTION READINESS

This phase makes AGXORA capable of turning a Growth Business Profile and
Phase 43 website/social outputs into a structured campaign plan with tasks,
milestones, readiness, insights, and approval-gated execution attempts.

Phase 44 is **not** a publishing integration phase.

## Explicit limitations

- **NO LIVE SOCIAL PUBLISHING**
- **NO LIVE OAUTH**
- **NO REAL ANALYTICS**
- **NO FAKE PUBLISHING**
- **NO PHASE 51**

Unavailable adapters return `available: false` / `published: false`. Campaigns
never become `COMPLETED` from a fake success. No access tokens or secrets are
stored.

## Architecture

The existing Agent OS remains the only execution runtime:

- `agentOsService.enqueueTask()` / `resolveApproval()`
- `AgentTask`, `AgentExecution`, `AgentPlan`, `StepExecution`
- `AgentApproval`
- `auditLog` / Agent OS step audit
- local persistence key `agxora-agent-os-v1`

Campaign orchestration lives in `features/agents/growth/service.ts` and
`features/agents/campaigns/`. It **calls** Agent OS. It does not implement a
second engine.

`GrowthBusinessProfile` stays separate from `app/lib/business/BusinessProfile.ts`.
Creator Studio, Integration Center, and the dashboard shell are unchanged.
`/dashboard/agents` remains the Agent OS entry point.

## Campaign domain

Additive models in `features/agents/campaigns/`:

- `Campaign`
- `CampaignObjective`
- `CampaignAudience`
- `CampaignChannel`
- `CampaignAsset`
- `CampaignTask`
- `CampaignMilestone`
- `CampaignStatus`
- `GrowthInsight`

Lifecycle:

`DRAFT → PLANNING → READY_FOR_APPROVAL → APPROVED → IN_PROGRESS → BLOCKED → COMPLETED | FAILED | CANCELLED`

Channels (extensible):

`WEBSITE | INSTAGRAM | FACEBOOK | TIKTOK | LINKEDIN | YOUTUBE`

External side-effect tasks (`publish`, `schedule`, account connection, publishing
configuration) set `externalSideEffect: true` and require Agent OS approval
before execution.

## Planner

`planCampaign()` is deterministic. It uses actual profile data (company name,
services, audience, USP, preferred platforms) and references Phase 43 outputs
when present:

- `WebsiteProject` → website asset, CTA, `websiteProjectId`
- `SocialStrategy` → content themes
- `SocialContentCalendar` → start date
- `SocialContentItem` → content ids / assets

Output includes objective, audience, offer, core message, website CTA, social
themes, channels, tasks, milestones, and execution blockers later computed by
readiness.

## Readiness

`evaluateCampaignReadiness()` returns:

```
{ ready, score, blockers, warnings, completedChecks }
```

The score is a weighted sum of completed checks (max 100) and is deterministic.

Always-on Phase 44 publishing blocker:

- `publishing.unavailable` — Publishing integration not configured

Disconnected required social channels produce:

- `social.disconnected` — Social account connection required

`ready` is `false` while blockers exist. The evaluator never pretends an
unavailable adapter is available.

## Growth intelligence

`buildGrowthInsights()` transforms available AGXORA data into:

- `PRIORITY`
- `OPPORTUNITY`
- `RISK`
- `ACTION`

Insights use stable ids/codes and optional params. They do not invent analytics
or market data. UI copy is localized from `agents.campaigns.insights.*`.

## Agent OS integration

- Agent id: `growth_campaign`
- Tools:
  - `campaign_plan` — generation, no approval
  - `campaign_readiness` — analysis, no approval
  - `growth_insights` — analysis, no approval
  - `campaign_execute` — `requiresApproval: true`
- Existing tools are reused, not duplicated:
  - `website_publish`
  - `social_publish`
  - `social_schedule`

Lifecycle remains the Agent OS lifecycle:

`UNDERSTAND → PLAN → WAITING_FOR_APPROVAL → EXECUTING → VERIFYING → COMPLETED | FAILED | BLOCKED | CANCELLED`

## Approval flow

There is no separate `CampaignApprovalStore` / `CampaignApprovalService`.

Campaign records may store `approvalState`, but execution approval is
`AgentApproval`.

1. Plan / inspect / edit without executing
2. Request execution → `campaign_execute` pauses at `WAITING_FOR_APPROVAL`
3. Resolve with existing `POST /agents/approvals/resolve`
4. On approve, attempt existing website/social adapters
5. If adapters are unavailable, campaign becomes `BLOCKED` and is **not** `COMPLETED`
6. On reject, campaign becomes `BLOCKED` and cannot be re-executed

## Persistence

Agent OS state version is now `4`. `normalizeState()` upgrades version-2 and
version-3 payloads and fills:

- previous Phase 42/43 arrays
- `campaigns: []`
- `growthInsights: []`

Old localStorage continues to load. No tokens, OAuth credentials, or secrets.

## API

Existing `/agents` dispatch handlers were extended:

- `GET/POST /agents/growth/campaigns`
- `GET /agents/growth/campaigns/:id`
- `POST /agents/growth/campaigns/plan`
- `POST /agents/growth/campaigns/readiness`
- `POST /agents/growth/insights`
- `POST /agents/growth/campaigns/:id/approve`
- reused `POST /agents/approvals/resolve`

## UI

The experience stays on `/dashboard/agents`. New Agent OS tab: **Campaigns**.

Existing tabs continue: Dashboard, Registry, Marketplace, Monitor, History,
Memory, Knowledge, Tools, Settings, Growth, Website, Social.

Campaign detail shows overview, objective, audience, offer, channels, timeline,
tasks, milestones, readiness score, growth insights, approval state, and
execution blockers. Publishing gaps surface “Publishing integration not
configured”.

## Tests

`app/lib/agents/agentCampaign.test.ts` covers:

1. Incomplete-profile planning
2. Planner uses real GrowthBusinessProfile data
3. Website/social references
4. Deterministic readiness
5. Disconnected social blocker
6. Missing publishing blocker
7. No `COMPLETED` without successful execution
8. Existing `AgentApproval`
9. Rejected approval blocks execution
10. Approved campaign can attempt execution
11. Unavailable adapter never fakes success
12. Deterministic insights
13. Persistence v2/v3 → v4
14–15. Existing Phase 42 and Phase 43 tests remain

## Validation

Run:

- `npm test`
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run i18n:validate`
- `npm run i18n:check`

## Future integration points

Later phases can replace:

- `WebsitePublisherAdapter`
- `SocialPlatformAdapter` implementations

without rewriting Agent OS or inventing a second campaign approval system.
Phase 51 is out of scope.

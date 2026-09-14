# AGXORA Guardian

Engineering control plane for detecting, diagnosing, and preparing fixes.

**Guardian does not directly modify production.** It does not merge pull requests, approve pull requests, or deploy.

## Architecture

```
Observation → Detection → Incident → Diagnosis → Remediation plan
  → (SAFE, isolated worktree only) Validation → Security/diff/regression review
  → PR → Human approval → Merge (human) → Deploy (human) → Verify
```

HIGH-RISK changes (auth, OAuth, credentials, Prisma, billing, DNS, production env, tenant isolation, sending/publishing) are never auto-applied.

## Commands

```bash
npm run guardian
npm run guardian:check
npx tsx scripts/guardian/cli.ts check --dry-run
npx tsx scripts/guardian/cli.ts check --dry-run --json
npx tsx scripts/guardian/cli.ts check --dry-run --skip-health
```

## Dry-run

Dry-run is the default. It observes, detects, diagnoses, and plans. It does not write files, commit, push, create a PR, merge, or deploy.

## Run lifecycle

`running → detected → diagnosing → remediation_planned → (validating) → waiting_for_approval | completed | failed | skipped`

Each run reports: run ID, duration, observation/incident/diagnosis/remediation counts, validation result, PR result, final status.

## Risk model

`low | medium | high | critical`

Low risk is **not** permission to touch production.

SAFE examples: deterministic type errors, failing unit tests from local regressions, obvious imports, missing tests.

HIGH-RISK examples: authentication, authorization, OAuth, credentials, Prisma/migrations, billing, DNS, production env, tenant isolation, data deletion, external publishing, sending email.

## Safe-fix boundary

SAFE fixes, if ever applied, require:

- isolated worktree
- dedicated branch
- not `main`
- not production filesystem
- full validation (`npm test`, `type-check`, `lint`, `build`)
- security, diff, and regression review
- PR for a human

Guardian never: merges, approves, deploys, changes DNS, or changes production env vars.

## Validation gates

Automated remediation must pass, in order:

1. `npm test`
2. `npm run type-check`
3. `npm run lint`
4. `npm run build`

Then security review, diff review, and regression review. Any required gate failure stops the run. Guardian does not emit a misleading ready result.

## PR workflow

After validation, Guardian may open a PR that includes incident, diagnosis, evidence, files, remediation summary, validation, security review, and risk classification.

Guardian must not merge, approve, or deploy that PR. A human is the approval boundary.

## Security rules

Never log or persist secrets, tokens, API keys, Authorization headers, or `.env` contents. Production, DNS, and production environment files are mutation-blocked. Tenant isolation, OAuth, billing, and publishing changes are human-review only.

## Idempotency

Incidents use SHA-256 fingerprints (`category|source|component|title`). Repeated runs against the same unchanged issue upsert rather than duplicate incidents, PRs, or identical audit events.

## Persistence

Phase 4 uses an in-memory store (optional future `.guardian/` local state, gitignored).
Existing `AgentRun` rows are tenant Agent plans, not engineering runs — they are not reused.

No Prisma migration.

## Scheduling

A future Cursor Automation, GitHub Action, or CI job can invoke `npm run guardian:check`.
Guardian is not coupled to a specific scheduler. Triggers (`cli`, `scheduled`, `ci`, `health`, `deployment`, `pr`, `manual`) are recorded on the run.

## Honesty

Empty incident lists are valid. Guardian does not invent production errors or fake self-healing metrics.

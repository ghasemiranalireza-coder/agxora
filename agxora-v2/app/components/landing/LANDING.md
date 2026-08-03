# AGXORA Landing Architecture

## Scope

Public marketing surface only (`/`). Authenticated application chrome (dashboard,
sidebar, header, hero, globe internals, theme, nav) is intentionally unchanged.

## Composition

| Layer | Responsibility |
|-------|----------------|
| `app/page.tsx` | SEO metadata, fonts, JSON-LD, mounts `LandingPage` |
| `LandingPage` | Atmosphere + sections orchestration |
| `LandingHero` | Brand-first hero, alien plane, globe integration |
| `LandingMetrics` | Capability statistics with tasteful motion |
| `LandingValueProps` | Enterprise AI / Automation / Analytics / Security / Integrations / Identity / Intelligence |
| `LandingPreview` | Faithful product preview of real module vocabulary |
| `LandingFeatureGrid` | Interactive feature cards |
| `LandingTrust` | Placeholders for customers, compliance, security |
| `LandingFinalCta` | Start Free / Explore / Consultation |

## Brand principles (v1.0)

1. **Brand first** — AGXORA is the hero typographic signal; headlines never overpower it.
2. **Alien as intelligence** — partially revealed in darkness, one eye glow, soft rim light — observing, not a mascot.
3. **Globe as centerpiece** — global intelligence; reused `AgxoraGlobe3D` via dynamic import with aura + reflection; no dashboard edits.
4. **Atmosphere** — quiet gradients, soft vignette, sparse particles, film grain noise.
5. **Restraint** — motion is fast, subtle, and respects `prefers-reduced-motion`.

## Animation guidelines

- Prefer Framer Motion fade/rise under 0.5s with shared `LANDING_EASE`.
- Hero copy uses CSS entrance (never opacity-0 SSR).
- One intentional alien-eye pulse; particle drift is CSS-only and sparse.
- Feature cards: glass lift + border accent only.

## Future marketing expansion

- Swap trust placeholders for real logos and quotes.
- Add `/pricing`, `/security`, `/customers` pages reusing `landing.css` tokens.
- Wire `Request Demo` to a CRM form or calendar.
- Add localized copy via existing i18n foundations without altering dashboard shells.

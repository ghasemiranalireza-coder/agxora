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

## Brand principles

1. **Brand first** — AGXORA is the hero typographic signal; headlines never overpower it.
2. **Alien as intelligence** — premium, soft glow, enterprise tone (not game UI).
3. **Globe as system** — reused `AgxoraGlobe3D` via dynamic import; no dashboard edits.
4. **Atmosphere** — gradients, noise, soft light, sparse particles.
5. **Restraint** — motion is fast, subtle, and respects `prefers-reduced-motion`.

## Animation guidelines

- Prefer Framer Motion fade/rise under 1s.
- One intentional pulse on alien glow; particle drift is CSS-only and sparse.
- Feature cards: hover lift + border accent only.
- Disable transform animations when `useReducedMotion()` is true.

## Future marketing expansion

- Swap trust placeholders for real logos and quotes.
- Add `/pricing`, `/security`, `/customers` pages reusing `landing.css` tokens.
- Wire `Request Demo` to a CRM form or calendar.
- Add localized copy via existing i18n foundations without altering dashboard shells.

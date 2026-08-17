# Global Internationalization (i18n)

AGXORA uses a centralized, SSR-safe internationalization system. One global locale controls the entire application UI.

## Architecture

```
agxora-locale cookie (SSR) + localStorage (client)
  → LocaleProvider (React context)
  → t('namespace.key') / useLocale()
  → resolveMessage(locale, key) → bundled JSON catalogs
  → English fallback for missing keys
```

### Key modules

| Module | Purpose |
|--------|---------|
| `app/lib/i18n/locale.ts` | Supported locales, BCP-47 tags, RTL/CJK helpers |
| `app/lib/i18n/LocaleProvider.tsx` | Global locale state, persistence, `t()` hook |
| `app/lib/i18n/translate.ts` | Key resolution, interpolation, English fallback |
| `app/lib/i18n/catalog.ts` | Auto-generated bundle imports |
| `app/lib/i18n/format.ts` | Locale-aware dates, numbers, currency (`Intl`) |
| `app/lib/i18n/messages/{locale}/*.json` | Per-namespace translation resources |
| `app/lib/i18n/bundles/{locale}.json` | Merged bundles (generated) |
| `scripts/i18n/build-bundles.mjs` | Merge namespaces → bundles + regenerate catalog |
| `scripts/i18n/translate-parallel.mjs` | Generate locale files from English via API + cache |

## Supported locales (24)

| Code | Language | Direction |
|------|----------|-----------|
| `en` | English | LTR |
| `de` | Deutsch | LTR |
| `fa` | فارسی | **RTL** |
| `zh-CN` | 简体中文 | LTR |
| `zh-TW` | 繁體中文 | LTR |
| `ja` | 日本語 | LTR |
| `nl` | Nederlands | LTR |
| `nl-BE` | Nederlands (België) | LTR |
| `fr` | Français | LTR |
| `fr-BE` | Français (Belgique) | LTR |
| `de-BE` | Deutsch (Belgien) | LTR |
| `es` | Español | LTR |
| `it` | Italiano | LTR |
| `pt` | Português | LTR |
| `pt-BR` | Português (Brasil) | LTR |
| `ru` | Русский | LTR |
| `tr` | Türkce | LTR |
| `ar` | العربية | **RTL** |
| `ko` | 한국어 | LTR |
| `pl` | Polski | LTR |
| `uk` | Українська | LTR |
| `hi` | हिन्दी | LTR |
| `id` | Bahasa Indonesia | LTR |
| `vi` | Tiếng Việt | LTR |

Belgian locales use proper language variants (Dutch/French/German), not a fictional "Belgian" language.

## Namespaces (27)

`common`, `navigation`, `auth`, `dashboard`, `crm`, `finance`, `documents`, `landing`, `pricing`, `billing`, `settings`, `errors`, `projects`, `automation`, `team`, `customers`, `ai`, `agents`, `integrations`, `intelligence`, `legal`, `onboarding`, `creator`, `backend`, `workspace`, `iam`, `ui`

## Language selection

- `LanguageSwitcher` in settings and public nav
- Writes `agxora-locale` cookie + `agxora-locale-v2` localStorage
- SSR reads cookie in root layout → `lang` + `dir` on `<html>`
- Client hydrates with same seed; no hydration mismatch

## Fallback strategy

1. Primary locale catalog
2. English catalog (`en`)
3. Return key string (dev warns via `console.warn`)

Missing keys never crash the UI.

## RTL support

- `fa` and `ar` set `dir="rtl"` on `<html>`
- CSS uses logical properties and `[dir=rtl]` overrides in `globals.css`
- Noto Sans Arabic font for RTL scripts
- Sidebar, tables, modals respect direction

## CJK support

- Noto Sans SC and Noto Sans JP loaded in root layout
- CJK font stacks in `globals.css` for `zh-CN`, `zh-TW`, `ja`
- Buttons and nav use flexible/min-width patterns to avoid clipping

## Locale-aware formatting

Use `formatDate`, `formatCurrency`, `formatNumber`, `formatPercent` from `app/lib/i18n/format.ts`. These follow active UI locale via `LocaleProvider`.

## Adding a new language

1. Add locale to `SUPPORTED_LOCALES`, `LOCALE_LABELS`, `LOCALE_BCP47` in `locale.ts`
2. Run `node scripts/i18n/translate-parallel.mjs` (or create `messages/{locale}/*.json` manually)
3. Run `node scripts/i18n/build-bundles.mjs`
4. Add i18n regression sample in `app/lib/i18n/i18n.test.ts`

## Adding new UI strings

1. Add key to `messages/en/{namespace}.json`
2. Use `t('namespace.key')` in components — never hardcode user-facing text
3. Rebuild bundles: `node scripts/i18n/build-bundles.mjs`
4. Re-run translation script for non-English locales

## Testing

```bash
npm test                    # includes app/lib/i18n/i18n.test.ts
node scripts/i18n/check-hardcoded.mjs
npm run build
```

## Translation coverage

- **English**: complete source of truth (~2,500+ keys)
- **German / Persian**: original Phase 41 catalogs + generated extensions
- **All other locales**: generated via `translate-parallel.mjs` (MyMemory API + disk cache)

Regenerate translations:

```bash
node scripts/i18n/translate-parallel.mjs
node scripts/i18n/build-bundles.mjs
```

## Known limitations

- Next.js `metadata` exports in some pages remain English (SEO); UI is fully localized
- Some data-driven labels (enum values from API, workflow names) remain untranslated by design
- Translation API rate limits may require re-running `translate-parallel.mjs` for full coverage
- Legal page body copy length varies by language; layout uses flexible containers

## Out of scope

- Backend error codes / Prisma model names
- Route paths and API URLs
- CRM/auth business logic changes

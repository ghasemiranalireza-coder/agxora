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

`next/font` for Noto Sans SC/TC/JP/KR only exposes latin/cyrillic/vietnamese subsets, so CJK glyphs are loaded via Google Fonts CSS2 (`CjkFontLinks`) plus system fallbacks:

- `zh-CN`: Noto Sans SC, PingFang SC, Microsoft YaHei
- `zh-TW`: Noto Sans TC, PingFang TC, Microsoft JhengHei
- `ja`: Noto Sans JP, Hiragino Sans, Yu Gothic
- `ko`: Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic

## Belgian locales

`nl-BE`, `fr-BE`, and `de-BE` remain in the selector. Regional wording may match the parent language; formatting still uses the regional BCP-47 tag (`nl-BE`, `fr-BE`, `de-BE`).

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
npm run i18n:validate       # key + placeholder parity across all 24 locales
npm run i18n:check          # hardcoded user-facing English audit
npm run i18n:bundles        # validate sources, then merge bundles
npm run type-check
npm run build
```

### Placeholder rule (blocking)

Translation variables must never be renamed. If English contains `{amount}` / `{percent}`, every locale must keep those exact names. `scripts/i18n/validate-i18n.mjs` fails CI when placeholder sets differ or keys are missing.

Generation scripts (`translate-google.mjs`, `translate-parallel.mjs`) protect `{placeholders}` before calling the translation API, restore them after, then run validation.

## RTL support

- `fa` and `ar` set `dir="rtl"` on `<html>` via SSR cookie + `HtmlLangSync`
- Skip-link, password toggle, tables, and mobile sidebar use logical CSS (`inset-inline-*`, `text-align: start`)
- `globals.css` maps leftover physical Tailwind utilities under `html[dir="rtl"]`
- Noto Sans Arabic is loaded with the `arabic` subset

## CJK support

`next/font` for Noto Sans SC/TC/JP/KR only exposes latin/cyrillic/vietnamese subsets, so CJK glyphs are loaded via Google Fonts CSS2 (`CjkFontLinks`) plus system fallbacks:

- `zh-CN`: Noto Sans SC, PingFang SC, Microsoft YaHei
- `zh-TW`: Noto Sans TC, PingFang TC, Microsoft JhengHei
- `ja`: Noto Sans JP, Hiragino Sans, Yu Gothic
- `ko`: Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic

## Belgian locales

`nl-BE`, `fr-BE`, and `de-BE` remain in the selector. Regional wording may match the parent language; formatting still uses the regional BCP-47 tag (`nl-BE`, `fr-BE`, `de-BE`).

## Fallback strategy

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

- Next.js `metadata` exports in some pages remain English (SEO); UI copy is localized
- Root `global-error.tsx` cannot use LocaleProvider; it renders English from `DEFAULT_LOCALE`
- Stored workflow node labels and seed/demo data stay in their original language
- Belgian locales may share parent-language wording where regional variants are identical
- Legal page body copy length varies by language; layout uses flexible containers

## Out of scope

- Backend error codes / Prisma model names
- Route paths and API URLs
- CRM/auth business logic changes

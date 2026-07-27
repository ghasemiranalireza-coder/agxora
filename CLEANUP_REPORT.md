# AGXORA Cleanup Report

**Generated:** 2026-07-27  
**Scope:** Repository audit & workspace standardization (no deletions performed)  
**Branch intent:** Organization only — no UI or business-logic changes

---

## 1. Active project root

| Role | Path |
|------|------|
| **Official / active Next.js app** | `agxora-v2/` (repository-relative) |
| **Windows absolute (local machine)** | `C:\Users\texti\agxora\app\agxora-v2` |
| **Cloud / clone layout in this repo** | `<repo-root>/agxora-v2` |
| **Package name** | `agxora-v2` (`agxora-v2/package.json`) |
| **Next config** | `agxora-v2/next.config.ts` (**only** active app config) |
| **Lockfile (active)** | `agxora-v2/package-lock.json` |

> **Note on Windows path vs git layout:** This GitHub repository currently places the app at `agxora-v2/` (repo root child). On the local Windows machine the same app should be opened at `C:\Users\texti\agxora\app\agxora-v2`. The VS Code workspace and `start-dev.*` scripts resolve the app directory relative to the repository root (`agxora-v2`, with a fallback for `app\agxora-v2`).

**Source of truth:** There must be exactly **one** application used for development and production: **`agxora-v2`**.

---

## 2. Duplicate folders / second Next.js app

| Path | Status | Notes |
|------|--------|-------|
| `agxora-clean/` | **Duplicate / obsolete scaffold** | Separate Next.js 16 app (`name: agxora-clean`). Default create-next-app content (`app/page.tsx`, stock SVGs). **Not** the product. |
| `agxora-v2/` | **Active** | Full AGXORA product (dashboard, AI, SaaS, globe, auth, etc.) |

---

## 3. Backup folders

| Path | Status |
|------|--------|
| *(none found)* | No `*backup*`, `*.bak`, or `*-old*` project folders detected at repo root. |

---

## 4. Old / generated files

| Path | Kind | Tracked? | Notes |
|------|------|----------|-------|
| `agxora-v2/.next/` | Next build/cache | No (gitignored) | Safe local artifact; regenerates on build |
| `agxora-v2/tsconfig.tsbuildinfo` | TS incremental | No (gitignored via `*.tsbuildinfo`) | Safe local artifact |
| `agxora-v2/node_modules/` | Dependencies | No | Install via `npm install` in `agxora-v2` |
| `agxora-clean/node_modules/` | Dependencies | No | Belongs to obsolete app |
| `agxora-clean/package-lock.json` | Lockfile | Yes | Orphan lockfile for non-active app |

---

## 5. Safe-to-delete folders (manual review — **not deleted**)

| Candidate | Why safe (after confirmation) | Risk |
|-----------|-------------------------------|------|
| **`agxora-clean/`** (entire tree) | Unused second Next.js app; no product features; not referenced by `agxora-v2` | Low — confirm no local scripts still `cd` into it |
| `agxora-clean/node_modules/` | Regenerable / unused | None |
| `agxora-v2/.next/` | Regenerable cache | None |
| `agxora-v2/node_modules/` | Regenerable (prefer `npm ci` in `agxora-v2`) | None if lockfile kept |

**Do not delete without review:** `agxora-v2/public/alien-clean.png` (referenced by `app/page.tsx`).

---

## 6. Files referenced nowhere (candidates)

| File | Referenced in source? | Recommendation |
|------|----------------------|----------------|
| `agxora-v2/public/file.svg` | No | Safe-to-delete candidate (stock Next asset) |
| `agxora-v2/public/globe.svg` | No | Safe-to-delete candidate |
| `agxora-v2/public/next.svg` | No | Safe-to-delete candidate |
| `agxora-v2/public/vercel.svg` | No | Safe-to-delete candidate |
| `agxora-v2/public/window.svg` | No | Safe-to-delete candidate |
| `agxora-v2/public/alien-clean.png` | **Yes** (`app/page.tsx`) | **Keep** |
| Everything under `agxora-clean/public/*` | Only within obsolete app | Delete with `agxora-clean/` |

---

## 7. Duplicate `package.json` files

| Path | Active? |
|------|---------|
| `agxora-v2/package.json` | **Yes — use this** |
| `agxora-clean/package.json` | No — obsolete |

---

## 8. Duplicate `package-lock.json` files

| Path | Active? |
|------|---------|
| `agxora-v2/package-lock.json` | **Yes — single lockfile for the product** |
| `agxora-clean/package-lock.json` | No — remove when deleting `agxora-clean/` |

---

## 9. Duplicate `node_modules`

| Path | Notes |
|------|-------|
| `agxora-v2/node_modules/` | Active install |
| `agxora-clean/node_modules/` | Obsolete duplicate (~hundreds of MB) |

---

## 10. Duplicate `.next` folders

| Path | Notes |
|------|-------|
| `agxora-v2/.next/` | Active app cache (present locally) |
| `agxora-clean/.next/` | Not present in this environment |

---

## 11. Workspace structure verification

### Required folders (under active app `agxora-v2/`)

| Folder | Status | Location / notes |
|--------|--------|------------------|
| `app/` | ✅ | Next.js App Router (`agxora-v2/app`) |
| `components/` | ✅ | Reserved top-level + **implementation** in `app/components/` |
| `lib/` | ✅ | Reserved top-level + **implementation** in `app/lib/` |
| `hooks/` | ✅ | Created (`agxora-v2/hooks/`) |
| `styles/` | ✅ | Created (`agxora-v2/styles/`); global CSS remains `app/globals.css` |
| `public/` | ✅ | `agxora-v2/public/` |
| `types/` | ✅ | Created (`agxora-v2/types/`) |
| `providers/` | ✅ | Reserved top-level + **implementation** in `app/providers/` |
| `contexts/` | ✅ | Created (`agxora-v2/contexts/`) |

**Why implementations stay under `app/` for components/lib/providers:** Existing App Router colocation and relative imports. Top-level folders + `tsconfig` path aliases standardize the layout without a risky mass file move (which would risk UI/behavior regressions). Future modules can land in the top-level folders.

### Next.js configuration

| Check | Result |
|-------|--------|
| Single active `next.config.*` | ✅ `agxora-v2/next.config.ts` |
| Extra config | ⚠️ `agxora-clean/next.config.ts` (obsolete app) |
| Turbopack root | ✅ Set explicitly to the `agxora-v2` project directory in `next.config.ts` |

### Imports

| Check | Result |
|-------|--------|
| Path alias `@/*` | ✅ maps to project root (`./*`) |
| Aliases `@/components`, `@/lib`, `@/providers`, `@/hooks`, `@/styles`, `@/types`, `@/contexts` | ✅ added → resolve to implementation or reserved folders |
| Broken deep `../../../` imports | ✅ none found |
| App Router relative imports (`../components`, `../lib`) | ✅ valid; left unchanged to avoid UI/logic risk |

---

## 12. Dev entrypoint standardization

| Artifact | Purpose |
|----------|---------|
| `AGXORA.code-workspace` | Opens `agxora-v2` as the primary workspace folder |
| `start-dev.bat` | Windows CMD: locate app → verify git → pull `main` → `npm install` if needed → `npm run dev` |
| `start-dev.ps1` | PowerShell equivalent |

Both scripts always start Next.js from the **`agxora-v2`** project directory (or `app\agxora-v2` if that layout is used locally).

---

## 13. Recommended follow-up (manual)

1. Delete `agxora-clean/` after team confirmation.  
2. Optionally remove unused stock SVGs under `agxora-v2/public/`.  
3. Point Vercel / CI **Root Directory** at `agxora-v2` (if not already).  
4. On Windows, open `AGXORA.code-workspace` or run `start-dev.ps1` / `start-dev.bat` from the repo root.

---

## 14. Validation

Run inside `agxora-v2`:

```bash
npm run lint
npm run build
```

Both must pass after this standardization commit.

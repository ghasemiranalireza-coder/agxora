# AGXORA

This repository contains two independent Next.js 16 (App Router) / React 19 / TypeScript frontend apps. There is no root workspace tooling — each app is its own npm project with its own `package.json` and `package-lock.json`.

- `agxora-v2/` — the primary app: marketing landing page (`/`), `/login`, and `/dashboard` (BI widgets + a 3D `AgxoraGlobe`).
- `agxora-clean/` — a near-empty create-next-app scaffold (renders `AGXORA TEST`).

Both apps are purely client/static frontends: no backend, API routes, database, env vars, or external services. All data shown is hard-coded mock data.

## Cursor Cloud specific instructions

- Run each app from its own directory. Standard scripts are in each `package.json`: `npm run dev`, `npm run build`, `npm start`, `npm run lint`. There is no test framework configured.
- Both apps default to port 3000. To run them at the same time, start the second on another port, e.g. `npm run dev -- -p 3001`.
- `agxora-v2/app/components/AgxoraGlobe.tsx` (used by `/dashboard`) imports `@react-three/fiber` and `@react-three/drei`. These are declared in `agxora-v2/package.json`; if a build fails with "Module not found: Can't resolve '@react-three/...'", run `npm install` in `agxora-v2` (they are required for the `/dashboard` route to build and render).
- This is Next.js 16, which has breaking changes vs. older versions (see each app's `AGENTS.md`). Consult `node_modules/next/dist/docs/` before writing Next.js code.

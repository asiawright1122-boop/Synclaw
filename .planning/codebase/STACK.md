# Technology Stack

**Analysis Date:** 2026-04-03

## Languages

**Primary:**
- TypeScript (Electron client, Next.js web, OpenClaw gateway) - `client/package.json`, `web/package.json`, `client/resources/openclaw-source/package.json`

**Secondary:**
- JavaScript/Node ESM (build scripts and tooling configs) - `client/scripts/build-main.mjs`, `client/scripts/download-openclaw.mjs`, `web/postcss.config.mjs`
- Prisma schema (PostgreSQL data model) - `web/prisma/schema.prisma`
- CSS (Tailwind/PostCSS styling) - `client/tailwind.config.js`, `web/postcss.config.mjs`

## Runtime

**Environment:**
- Node.js baseline >= 20 and OpenClaw gateway requires >= 22.12/22.14 - `README.md`, `DEVELOPMENT_GUIDELINES.md`, `client/resources/openclaw-source/package.json`
- Electron runtime (desktop app) - `client/package.json`
- Next.js server runtime (standalone output) - `web/package.json`, `web/next.config.ts`

**Package Manager:**
- pnpm (primary) - `client/pnpm-lock.yaml`, `web/pnpm-lock.yaml`
- npm lockfile present (secondary/legacy) - `client/package-lock.json`
- OpenClaw package manager pinned to pnpm@10.32.1 - `client/resources/openclaw-source/package.json`

## Frameworks

**Core:**
- Electron + React renderer (desktop shell) - `client/package.json`, `client/src/renderer/App.tsx`
- Vite (renderer build/dev) - `client/package.json`, `client/vite.config.ts`
- OpenClaw Gateway (bundled Node service) - `client/resources/openclaw-source/package.json`, `client/src/main/openclaw.ts`
- Next.js App Router (web/portal/API) - `web/package.json`, `web/src/app`, `web/next.config.ts`
- Tailwind CSS (desktop and web) - `client/package.json`, `web/package.json`, `client/tailwind.config.js`, `web/postcss.config.mjs`
- Prisma ORM (web DB) - `web/package.json`, `web/prisma/schema.prisma`
- NextAuth (web auth) - `web/package.json`, `web/src/lib/auth.ts`

**Testing:**
- Playwright (E2E) - `client/package.json`, `client/playwright.config.ts`, `web/package.json`, `web/playwright.config.ts`
- Vitest (unit) - `client/package.json`, `client/vitest.config.ts`
- Testing Library (React) - `client/package.json`

**Build/Dev:**
- electron-builder (packaging) - `client/package.json`, `client/electron-builder.yml`
- TypeScript compiler (main + web) - `client/package.json`, `client/tsconfig.main.json`, `web/tsconfig.json`
- PostCSS + Autoprefixer - `client/package.json`, `client/postcss.config.js`, `web/postcss.config.mjs`
- esbuild (bundling/transforms) - `client/package.json`
- tsx (OpenClaw dev runner) - `client/resources/openclaw-source/package.json`, `client/src/main/openclaw.ts`
- concurrently + wait-on (Electron dev orchestration) - `client/package.json`

## Key Dependencies

**Critical:**
- OpenClaw gateway + SDKs (AI runtime, MCP) - `client/resources/openclaw-source/package.json`, `DEVELOPMENT_GUIDELINES.md`
- Stripe SDK (payments) - `web/package.json`, `web/src/lib/stripe.ts`
- Prisma client (DB access) - `web/package.json`, `web/src/lib/prisma.ts`
- NextAuth (session/auth) - `web/package.json`, `web/src/lib/auth.ts`
- electron-store (settings persistence) - `client/package.json`, `client/src/main/index.ts`
- electron-updater (auto-update) - `client/package.json`, `client/src/main/updater.ts`

**Infrastructure:**
- WebSocket stack (`ws`) - `client/package.json`, `client/resources/openclaw-source/package.json`
- HTTP servers (Express/Hono in OpenClaw) - `client/resources/openclaw-source/package.json`
- Local vector storage (`sqlite-vec` in OpenClaw) - `client/resources/openclaw-source/package.json`

## Configuration

**Environment:**
- Env files present (examples + local) - `client/.env.example`, `web/.env.example`, `web/.env.local`
- Runtime env usage (desktop + web) - `client/src/main/index.ts`, `client/src/main/updater.ts`, `web/src/lib/stripe.ts`, `web/src/lib/email.ts`

**Build:**
- Desktop build config - `client/vite.config.ts`, `client/tsconfig.main.json`, `client/electron-builder.yml`
- Web build config - `web/next.config.ts`, `web/postcss.config.mjs`, `web/tsconfig.json`

## Platform Requirements

**Development:**
- Node.js >= 20 (repo baseline) - `README.md`
- OpenClaw requires Node.js >= 22.12/22.14 - `DEVELOPMENT_GUIDELINES.md`, `client/resources/openclaw-source/package.json`
- pnpm >= 8 - `README.md`
- macOS/Windows/Linux dev support - `README.md`
- CI uses Node 22 - `.github/workflows/ci.yml`

**Production:**
- Electron packaged apps for macOS/Windows/Linux - `client/electron-builder.yml`
- Web app builds as Next.js standalone output (Docker-friendly) - `web/next.config.ts`

---

*Stack analysis: 2026-04-03*

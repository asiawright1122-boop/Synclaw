# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript 5.3.3 — All source code (main process, renderer, preload)
- JavaScript/ESNext — Build tooling (vite.config.ts, postcss.config.js)

**Secondary:**
- Shell — Build scripts (MJS)
- CSS/Tailwind — Styling

## Runtime

**Environment:**
- Electron 28.0.0 — Desktop application framework
- Node.js 18+ — OpenClaw Gateway subprocess

**Package Manager:**
- pnpm 9.x — Primary package manager
- Lockfile: `client/pnpm-lock.yaml` (present, 209KB)

**NOTE:** Both `package-lock.json` and `pnpm-lock.yaml` exist in `client/`. This is a potential conflict — pnpm is the primary manager per convention, but npm's lockfile was also generated. The lockfiles should be kept in sync or one removed.

## Frameworks

**Core:**
- React 18.2.0 — UI framework (renderer process)
- Next.js 16.2.0 — SaaS 平台（landing page + user portal + admin portal, web/ subrepo）

**State Management:**
- Zustand 4.4.7 — UI state only (renderer)
- electron-store 8.1.0 — Persistent settings (main process)

**Animation:**
- Framer Motion 10.16.16 — React animations

**Styling:**
- Tailwind CSS 3.3.6 — Utility-first CSS
- PostCSS 8.4.32 — CSS processing
- Autoprefixer 10.4.16 — Vendor prefixes

**Build/Dev:**
- Vite 5.0.10 — Build tool and dev server
- esbuild 0.27.4 — Main process bundling (scripts/build-main.mjs)
- TypeScript 5.3.3 — Type checking
- ESLint 8.56.0 — Linting
- @typescript-eslint 6.15.0 — TypeScript ESLint support
- concurrently 8.2.2 — Dev parallel process runner
- wait-on 7.2.0 — Dev server wait

**Packaging:**
- electron-builder 24.9.1 — Cross-platform packaging

**Testing:**
- Playwright 1.58.2 — E2E testing
- sharp 0.34.5 — Image processing (icons)
- png-to-ico 3.0.1 — Icon conversion

## Key Dependencies

**Critical:**
- `electron-log` 5.4.3 — Logging (replaces console)
- `electron-updater` 6.8.3 — Auto-update
- `ws` 8.19.0 — WebSocket client (Gateway bridge)
- `@types/ws` 8.18.1 — WebSocket types

**Rendering/UI:**
- `lucide-react` 0.294.0 — Icons
- `react-markdown` 10.1.0 — Markdown rendering
- `rehype-highlight` 7.0.2 — Code highlighting
- `remark-gfm` 4.0.1 — GitHub Flavored Markdown
- `highlight.js` 11.11.1 — Syntax highlighting

**Fonts:**
- `@fontsource/inter` 5.2.8 — Inter font
- `@fontsource/jetbrains-mono` 5.2.8 — JetBrains Mono font

**Web Subrepo (web/package.json):**
- `next` 16.2.0 — Landing page + SaaS portal
- `react` 19.2.4 / `react-dom` 19.2.4 — Web UI
- `zustand` 5.0.12 — Web state management
- `framer-motion` 12.38.0 — Web animations
- `lucide-react` 0.577.0 — Icons
- `next-auth` 4.24.13 — Authentication (JWT, bcrypt)
- `prisma` 5.22.0 / `@prisma/client` 5.22.0 — Database ORM
- `@tanstack/react-query` 5.91.2 — Data fetching
- `stripe` 20.4.1 — Payment integration
- `zod` 4.3.6 — Schema validation
- `bcryptjs` 3.0.3 — Password hashing
- `recharts` 3.8.0 — Charts
- `msw` 2.12.14 — API mocking (dev)

**Web Subrepo API Routes:**
- `POST /api/device-tokens` — Register SynClaw desktop device
- `GET/DELETE /api/device-tokens` — List/revoke device tokens
- `POST /api/usage-events` — Report AI usage (device token auth)
- `GET /api/usage` — Query usage stats (JWT auth, reads UsageEvent + CreditsHistory)

## Configuration

**Environment:**
- `.env.example` — Environment variable template
- `.env` — Not committed (secrets)

**Build:**
- `vite.config.ts` / `vite.config.js` — Vite configuration
- `tsconfig.json` — TypeScript (renderer)
- `tsconfig.main.json` — TypeScript (main process)
- `tsconfig.node.json` — TypeScript (node scripts)
- `tailwind.config.js` — Tailwind configuration
- `postcss.config.js` — PostCSS configuration
- `playwright.config.ts` — Playwright configuration
- `electron-builder.yml` — electron-builder configuration

## Platform Requirements

**Development:**
- Node.js 18+
- pnpm 9+
- macOS (primary), Windows, Linux

**Production:**
- Electron 28 compatible
- OpenClaw Gateway 2026.3.28 (bundled in resources)

---

*Stack analysis: 2026-03-31*

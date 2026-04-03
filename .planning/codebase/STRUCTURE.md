# Codebase Structure

**Analysis Date:** 2026-04-03

## Directory Layout

```
synclaw/
├── client/                  # Electron desktop app
│   ├── src/
│   │   ├── main/            # Main process runtime
│   │   ├── preload/         # Preload bridge
│   │   ├── renderer/        # React renderer UI
│   │   ├── shared/          # Shared types
│   │   └── test/            # Test utilities/mocks
│   ├── resources/           # Bundled OpenClaw runtime
│   ├── scripts/             # Build/download scripts
│   ├── e2e/                 # Playwright E2E tests
│   └── public/              # Static assets
├── web/                     # Next.js web platform
│   ├── src/
│   │   ├── app/             # App Router pages/layouts/API
│   │   ├── components/      # Shared UI components
│   │   ├── lib/             # Server utilities (auth, prisma, stripe, email)
│   │   └── types/           # Type augmentations
│   ├── prisma/              # Prisma schema
│   ├── api/                 # API proxy routes
│   └── tests/               # E2E tests
├── docs/                    # Product/design docs
├── .planning/               # GSD planning artifacts
├── .github/                 # CI workflows
├── README.md
└── SYSTEM_ARCHITECTURE.md
```

## Directory Purposes

**client/**:
- Purpose: Electron desktop application root.
- Contains: Main process, preload bridge, renderer UI, resources, scripts, tests.
- Key files: `client/src/main/index.ts`, `client/src/preload/index.ts`, `client/src/renderer/main.tsx`, `client/scripts/download-openclaw.mjs`, `client/e2e`.

**client/src/main/**:
- Purpose: Electron main process runtime and system integrations.
- Contains: IPC handlers, gateway bridge, tray, notifications, updater, settings.
- Key files: `client/src/main/index.ts`, `client/src/main/ipc-handlers.ts`, `client/src/main/gateway-bridge.ts`, `client/src/main/openclaw.ts`.

**client/src/main/ipc-handlers/**:
- Purpose: Domain-specific IPC handlers for renderer calls.
- Contains: Gateway, file, app settings, security, web API, clawhub CLI bridges.
- Key files: `client/src/main/ipc-handlers/gateway.ts`, `client/src/main/ipc-handlers/file.ts`, `client/src/main/ipc-handlers/web.ts`, `client/src/main/ipc-handlers/path-validation.ts`.

**client/src/preload/**:
- Purpose: IPC surface exposed to the renderer.
- Contains: `window.electronAPI` and `window.openclaw` wrappers.
- Key files: `client/src/preload/index.ts`.

**client/src/renderer/**:
- Purpose: React renderer application.
- Contains: Components, Zustand stores, hooks, services, styles.
- Key files: `client/src/renderer/main.tsx`, `client/src/renderer/App.tsx`, `client/src/renderer/stores/openclawStore.ts`, `client/src/renderer/services/subscription.ts`.

**client/src/renderer/components/**:
- Purpose: Desktop UI components and feature panels.
- Contains: Layout, chat, settings, navigation, modal components.
- Key files: `client/src/renderer/components/ChatView.tsx`, `client/src/renderer/components/SettingsView.tsx`, `client/src/renderer/components/Sidebar.tsx`.

**client/src/renderer/stores/**:
- Purpose: Zustand state containers for UI and gateway state.
- Contains: App, chat, settings, and openclaw stores.
- Key files: `client/src/renderer/stores/appStore.ts`, `client/src/renderer/stores/openclawStore.ts`, `client/src/renderer/stores/chatStore.ts`.

**client/resources/**:
- Purpose: Bundled OpenClaw runtime used by the desktop app.
- Contains: OpenClaw distribution and gateway runtime.
- Key files: `client/resources/openclaw-source`.

**web/**:
- Purpose: Next.js web platform for marketing, portal, and admin UI.
- Contains: App Router UI, API routes, Prisma schema, tests.
- Key files: `web/src/app/layout.tsx`, `web/src/app/page.tsx`, `web/src/app/api/auth/[...nextauth]/route.ts`, `web/prisma/schema.prisma`.

**web/src/app/**:
- Purpose: Next.js App Router pages, layouts, and API endpoints.
- Contains: Segment folders, `layout.tsx`, `page.tsx`, and `api/*/route.ts`.
- Key files: `web/src/app/(portal)/layout.tsx`, `web/src/app/(admin)/layout.tsx`, `web/src/app/api/credits/deduct/route.ts`.

**web/src/components/**:
- Purpose: Shared web UI shells and providers.
- Contains: Portal shell and session provider.
- Key files: `web/src/components/PortalShell.tsx`, `web/src/components/SessionProvider.tsx`.

**web/src/lib/**:
- Purpose: Server utilities and integrations for the web platform.
- Contains: Auth, Prisma, Stripe, email, validation helpers.
- Key files: `web/src/lib/auth.ts`, `web/src/lib/prisma.ts`, `web/src/lib/stripe.ts`, `web/src/lib/email.ts`, `web/src/lib/validations.ts`.

**web/prisma/**:
- Purpose: Prisma schema for Postgres data models.
- Contains: `schema.prisma`.
- Key files: `web/prisma/schema.prisma`.

**web/api/**:
- Purpose: API proxy routes to OpenClaw gateway.
- Contains: `route.ts` handlers for credits and notifications.
- Key files: `web/api/credits/history/route.ts`, `web/api/notifications/route.ts`.

**docs/**:
- Purpose: Product, platform, and design documentation.
- Contains: Design specs and roadmaps.
- Key files: `docs/PRODUCT_DESIGN_OVERVIEW.md`, `docs/LANDING_PAGE_DESIGN.md`, `docs/IM_CHANNELS_DESIGN.md`.

**.planning/**:
- Purpose: GSD planning artifacts and codebase maps.
- Contains: Roadmaps, phases, and codebase docs.
- Key files: `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/codebase/ARCHITECTURE.md`.

## Key File Locations

**Entry Points:**
- `client/src/main/index.ts`: Electron main process entry.
- `client/src/preload/index.ts`: Preload bridge entry.
- `client/src/renderer/main.tsx`: Renderer entry.
- `web/src/app/layout.tsx`: Web App Router root layout.
- `web/src/app/page.tsx`: Web landing page.
- `web/src/app/api/auth/[...nextauth]/route.ts`: NextAuth handler.
- `web/src/middleware.ts`: Protected route middleware.

**Configuration:**
- `client/package.json`: Desktop app scripts and dependencies.
- `client/electron-builder.yml`: Desktop build configuration.
- `client/tsconfig.json`: Desktop TypeScript config.
- `client/vite.config.ts`: Renderer build config.
- `web/package.json`: Web app scripts and dependencies.
- `web/next.config.ts`: Next.js configuration.
- `web/tsconfig.json`: Web TypeScript config.
- `web/prisma/schema.prisma`: Database schema source of truth.

**Core Logic:**
- `client/src/main/gateway-bridge.ts`: OpenClaw Gateway bridge.
- `client/src/main/openclaw.ts`: OpenClaw child-process lifecycle.
- `client/src/main/ipc-handlers/gateway.ts`: Gateway RPC IPC handlers.
- `client/src/main/ipc-handlers/file.ts`: File system IPC handlers.
- `client/src/renderer/services/subscription.ts`: Desktop web API client.
- `web/src/lib/auth.ts`: NextAuth configuration.
- `web/src/lib/prisma.ts`: Prisma client.
- `web/src/app/api/credits/deduct/route.ts`: Credits deduction endpoint.
- `web/src/app/api/webhooks/stripe/route.ts`: Stripe webhook handler.

**Testing:**
- `client/e2e`: Desktop Playwright tests.
- `client/src/test`: Renderer test utilities.
- `client/playwright.config.ts`: Desktop E2E config.
- `web/tests`: Web E2E tests.
- `web/playwright.config.ts`: Web E2E config.

## Naming Conventions

**Files:**
- `route.ts`: Next.js API endpoints in `web/src/app/api/**/route.ts`.
- `layout.tsx`: App Router layouts in `web/src/app/**/layout.tsx`.
- `page.tsx`: App Router pages in `web/src/app/**/page.tsx`.
- `*.tsx`: Renderer UI components in `client/src/renderer/components/*.tsx`.
- `*.ts`: Electron main/preload modules in `client/src/main/*.ts` and `client/src/preload/*.ts`.

**Directories:**
- Route groups use parentheses under App Router, e.g. `web/src/app/(portal)` and `web/src/app/(admin)`.

## Where to Add New Code

**New Feature:**
- Desktop UI: Add UI in `client/src/renderer/components` and state in `client/src/renderer/stores`.
- Desktop main process: Add capability modules in `client/src/main` and IPC handlers in `client/src/main/ipc-handlers`.
- Web UI page: Add a route folder with `page.tsx` under `web/src/app`.
- Web API endpoint: Add `web/src/app/api/<endpoint>/route.ts`.
- Tests: Add Playwright tests in `client/e2e` or `web/tests`.

**New Component/Module:**
- Desktop components: `client/src/renderer/components`.
- Web components: `web/src/components`.

**Utilities:**
- Desktop renderer helpers: `client/src/renderer/lib`.
- Desktop main utilities: `client/src/main`.
- Web server utilities: `web/src/lib`.

**New IPC Channel:**
- Implement handler in `client/src/main/ipc-handlers/<domain>.ts`.
- Register handler module in `client/src/main/ipc-handlers.ts`.
- Expose IPC method in `client/src/preload/index.ts`.

## Special Directories

**client/resources/openclaw-source/**:
- Purpose: OpenClaw runtime consumed by the desktop app.
- Generated: Yes (downloaded via `client/scripts/download-openclaw.mjs`).
- Committed: Yes.

**web/prisma/**:
- Purpose: Prisma schema and DB models.
- Generated: No.
- Committed: Yes.

**.planning/**:
- Purpose: Planning artifacts and codebase maps.
- Generated: Yes.
- Committed: Yes.

---

*Structure analysis: 2026-04-03*

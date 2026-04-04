# Architecture

**Analysis Date:** 2026-04-03

## Pattern Overview

**Overall:** Dual-application architecture: Electron desktop shell + Next.js web platform, with a local OpenClaw Gateway process bridged by IPC and WebSocket.

**Key Characteristics:**
- Separate Electron main/renderer with a preload IPC boundary (`client/src/main/index.ts`, `client/src/preload/index.ts`, `client/src/renderer/main.tsx`).
- Gateway RPC pass-through via IPC handlers to a WebSocket bridge (`client/src/main/ipc-handlers/gateway.ts`, `client/src/main/gateway-bridge.ts`).
- Web platform built on Next.js App Router with server route handlers, NextAuth, and Prisma (`web/src/app`, `web/src/app/api`, `web/src/lib/auth.ts`, `web/src/lib/prisma.ts`).

## Layers

**Electron Renderer (UI):**
- Purpose: Render the desktop UI and dispatch user actions.
- Location: `client/src/renderer`
- Contains: React views, Zustand stores, hooks, UI components, renderer services.
- Depends on: Preload APIs in `client/src/preload/index.ts` and service layer `client/src/renderer/services/subscription.ts`.
- Used by: BrowserWindow created in `client/src/main/index.ts`.

**Preload Bridge:**
- Purpose: Expose a controlled IPC API to the renderer.
- Location: `client/src/preload/index.ts`
- Contains: `electronAPI` and `openclaw` wrappers around `ipcRenderer.invoke`.
- Depends on: Electron `ipcRenderer`.
- Used by: Renderer stores and components (e.g. `client/src/renderer/stores/openclawStore.ts`).

**Electron Main Process:**
- Purpose: Manage windows, tray, notifications, updates, and settings persistence.
- Location: `client/src/main`
- Contains: `index.ts`, `tray.ts`, `notifications.ts`, `updater.ts`, `logger.ts`, `app-settings.ts`.
- Depends on: IPC handlers and Gateway bridge.
- Used by: Electron runtime entry `client/src/main/index.ts`.

**IPC Handler Layer:**
- Purpose: Route renderer IPC calls to main-process capabilities.
- Location: `client/src/main/ipc-handlers`
- Contains: `gateway.ts`, `file.ts`, `app.ts`, `security.ts`, `web.ts`, `clawhub.ts`, `shell.ts`, `path-validation.ts`.
- Depends on: `client/src/main/gateway-bridge.ts`, `client/src/main/index.ts`.
- Used by: Preload bridge `client/src/preload/index.ts`.

**Gateway Bridge + OpenClaw Process:**
- Purpose: Start OpenClaw, connect GatewayClient, and proxy RPC calls/events.
- Location: `client/src/main/gateway-bridge.ts`, `client/src/main/openclaw.ts`, `client/src/main/openclaw-gateway.ts`.
- Contains: Child-process lifecycle, HTTP readiness checks, WebSocket connection, event fan-out to BrowserWindow.
- Depends on: OpenClaw runtime under `client/resources/openclaw-source`.
- Used by: IPC handler `client/src/main/ipc-handlers/gateway.ts`.

**Web App UI (Next.js App Router):**
- Purpose: Serve marketing pages, customer portal, and admin console UI.
- Location: `web/src/app`
- Contains: `layout.tsx`, `page.tsx`, route segment folders, and portal/admin layouts.
- Depends on: UI components and session provider in `web/src/components/SessionProvider.tsx`.
- Used by: Next.js runtime.

**Web API Routes:**
- Purpose: Provide server-side endpoints for auth, billing, credits, devices, channels, and admin operations.
- Location: `web/src/app/api`, `web/api`
- Contains: `route.ts` files per endpoint, including `web/src/app/api/webhooks/stripe/route.ts`.
- Depends on: Prisma, Stripe, email, and validation helpers in `web/src/lib/*`.
- Used by: Web UI and desktop client API calls.

**Data Access Layer:**
- Purpose: Centralize database and external-service access.
- Location: `web/src/lib/prisma.ts`, `web/prisma/schema.prisma`, `web/src/lib/stripe.ts`, `web/src/lib/email.ts`.
- Contains: Prisma client, schema models, Stripe client factory, email sending utilities.
- Depends on: Environment configuration (not read here).
- Used by: API route handlers.

**Authentication + Middleware:**
- Purpose: Session auth, JWT enrichment, and route protection.
- Location: `web/src/lib/auth.ts`, `web/src/app/api/auth/[...nextauth]/route.ts`, `web/src/middleware.ts`.
- Contains: Credential provider auth flow, session callbacks, middleware matcher for protected routes.
- Depends on: Prisma user lookup in `web/src/lib/prisma.ts`.
- Used by: Protected UI routes and API routes.

## Data Flow

**Desktop AI Request (Renderer -> Gateway):**
1. UI triggers `window.openclaw.*` from `client/src/preload/index.ts` (used in `client/src/renderer/stores/openclawStore.ts`).
2. IPC handler in `client/src/main/ipc-handlers/gateway.ts` forwards to `GatewayBridge.request`.
3. Gateway bridge in `client/src/main/gateway-bridge.ts` ensures OpenClaw is running via `client/src/main/openclaw.ts` and forwards over WebSocket.

**Desktop File Operation:**
1. UI calls `window.electronAPI.file.*` from `client/src/preload/index.ts`.
2. `client/src/main/ipc-handlers/file.ts` validates paths with `client/src/main/ipc-handlers/path-validation.ts`.
3. Main process performs FS operation and returns `{ success, data, error }`.

**Desktop Web Platform API:**
1. Renderer service `client/src/renderer/services/subscription.ts` calls `/api/*`.
2. Main process and web bridge in `client/src/main/ipc-handlers/web.ts` manage device registration and usage reporting.
3. Web platform routes in `web/src/app/api/**/route.ts` persist data with Prisma.

**Web Auth + Protected Routes:**
1. Credentials POST to `web/src/app/api/auth/login/route.ts`.
2. NextAuth handler in `web/src/app/api/auth/[...nextauth]/route.ts` validates with `web/src/lib/auth.ts`.
3. Middleware in `web/src/middleware.ts` enforces authenticated access and admin role checks.

**Stripe Webhook:**
1. Stripe POSTs to `web/src/app/api/webhooks/stripe/route.ts`.
2. Handler writes idempotent updates via `web/src/lib/prisma.ts`.
3. Billing/credits tables update in `web/prisma/schema.prisma`.

**State Management:**
- Desktop UI state: Zustand stores in `client/src/renderer/stores/*`.
- Desktop settings: electron-store initialized in `client/src/main/index.ts`, mutated via `client/src/main/ipc-handlers/app.ts`.
- Web session state: NextAuth JWT sessions configured in `web/src/lib/auth.ts`.
- Web persistence: Prisma models in `web/prisma/schema.prisma`.

## Key Abstractions

**GatewayBridge:**
- Purpose: Single RPC entrypoint to OpenClaw Gateway.
- Examples: `client/src/main/gateway-bridge.ts`, `client/src/main/ipc-handlers/gateway.ts`.
- Pattern: Bridge + request/response wrapper returning `{ success, data, error }`.

**IPC Handler Modules:**
- Purpose: Domain-specific IPC routing with explicit channel names.
- Examples: `client/src/main/ipc-handlers/file.ts`, `client/src/main/ipc-handlers/web.ts`, `client/src/main/ipc-handlers/clawhub.ts`.
- Pattern: `ipcMain.handle` per channel with shared helpers.

**Portal/Admin Shells:**
- Purpose: Shared layout and navigation for authenticated web UI.
- Examples: `web/src/components/PortalShell.tsx`, `web/src/app/(admin)/layout.tsx`.
- Pattern: Layout components with nav config arrays and consistent styling.

**API Route Modules:**
- Purpose: Single endpoint per `route.ts`.
- Examples: `web/src/app/api/credits/deduct/route.ts`, `web/src/app/api/subscription/checkout/route.ts`.
- Pattern: `export async function GET/POST` returning `NextResponse.json`.

## Entry Points

**Electron Main:**
- Location: `client/src/main/index.ts`
- Triggers: Electron app startup.
- Responsibilities: Create windows, register IPC, manage tray, settings, updates, gateway lifecycle.

**Electron Preload:**
- Location: `client/src/preload/index.ts`
- Triggers: BrowserWindow preload script.
- Responsibilities: Expose `window.electronAPI` and `window.openclaw`.

**Electron Renderer:**
- Location: `client/src/renderer/main.tsx`
- Triggers: BrowserWindow renderer load.
- Responsibilities: Render `<App />` from `client/src/renderer/App.tsx`.

**Web App:**
- Location: `web/src/app/layout.tsx`
- Triggers: Next.js App Router root layout.
- Responsibilities: Wrap pages with session provider.

**Web API Auth:**
- Location: `web/src/app/api/auth/[...nextauth]/route.ts`
- Triggers: NextAuth GET/POST handler.
- Responsibilities: Authentication session lifecycle.

**Web Middleware:**
- Location: `web/src/middleware.ts`
- Triggers: Requests matching `config.matcher`.
- Responsibilities: Gate protected routes and admin role checks.

**Stripe Webhook:**
- Location: `web/src/app/api/webhooks/stripe/route.ts`
- Triggers: Stripe webhook events.
- Responsibilities: Idempotent subscription and credits updates.

## Error Handling

**Strategy:** Return structured `{ success, data, error }` from IPC handlers and `NextResponse.json` with HTTP status codes from web API routes.

**Patterns:**
- Try/catch in `client/src/main/ipc-handlers/*.ts` with `success`/`error` responses.
- Zod validation and explicit status codes in `web/src/app/api/**/route.ts`.

## Cross-Cutting Concerns

**Logging:** electron-log in `client/src/main/logger.ts`; console logging in API routes such as `web/src/app/api/webhooks/stripe/route.ts`.
**Validation:** Path validation in `client/src/main/ipc-handlers/path-validation.ts`; Zod schemas in `web/src/lib/validations.ts`.
**Authentication:** NextAuth config in `web/src/lib/auth.ts` and route protection in `web/src/middleware.ts`.

---

*Architecture analysis: 2026-04-03*

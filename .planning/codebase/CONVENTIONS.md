# Coding Conventions

**Analysis Date:** 2026-04-03

## Naming Patterns

**Files:**
- Kebab-case module filenames in the main process (e.g., `client/src/main/gateway-bridge.ts`, `client/src/main/ipc-handlers/path-validation.ts`, `client/src/main/app-settings.ts`).
- PascalCase React component filenames in renderer and web UI (e.g., `client/src/renderer/components/AvatarSelector.tsx`, `client/src/renderer/components/Toast.tsx`, `web/src/components/PortalShell.tsx`).
- Hook filenames use `useX` in camelCase (e.g., `client/src/renderer/hooks/useTTS.ts`, `client/src/renderer/hooks/useContextMenu.ts`).
- Store filenames end with `Store` in camelCase (e.g., `client/src/renderer/stores/chatStore.ts`, `client/src/renderer/stores/settingsStore.ts`).
- Next.js App Router naming for pages and routes (`page.tsx`, `layout.tsx`, `route.ts`) under `web/src/app/...` (e.g., `web/src/app/page.tsx`, `web/src/app/(admin)/layout.tsx`, `web/src/app/api/devices/route.ts`).

**Functions:**
- camelCase for non-component functions and store actions (e.g., `setTheme`, `loadSettings` in `client/src/renderer/stores/settingsStore.ts`; `handleSelect` in `client/src/renderer/components/AvatarSelector.tsx`).
- PascalCase for React components and exported Next pages (e.g., `AvatarSelector` in `client/src/renderer/components/AvatarSelector.tsx`; `PortalShell` in `web/src/components/PortalShell.tsx`; `LandingPage` in `web/src/app/page.tsx`).
- `use` prefix reserved for hooks (e.g., `useTTS` in `client/src/renderer/hooks/useTTS.ts`, `useSpeechRecognition` in `client/src/renderer/hooks/useSpeechRecognition.ts`).

**Variables:**
- camelCase for locals and state (e.g., `currentAudioUrl` in `client/src/renderer/hooks/useTTS.ts`, `navItems` in `web/src/app/page.tsx`).
- SCREAMING_SNAKE_CASE for constants (e.g., `DEFAULT_SPEED`, `MAX_SPEED` in `client/src/renderer/hooks/useTTS.ts`, `MAX_MESSAGES` in `client/src/renderer/stores/chatStore.ts`).

**Types:**
- PascalCase for interfaces and type aliases (e.g., `ChatMessage`, `AttachmentFile` in `client/src/renderer/stores/chatStore.ts`, `SettingsState` in `client/src/renderer/stores/settingsStore.ts`, `RegisterInput` in `web/src/lib/validations.ts`).

## Code Style

**Formatting:**
- Semicolons are generally omitted in renderer/web files (e.g., `client/src/renderer/hooks/useTTS.ts`, `web/src/app/page.tsx`), but some legacy files include them (e.g., `client/src/renderer/lib/api.ts`); follow local file style.
- Single quotes for strings and imports (e.g., `client/src/renderer/components/AvatarSelector.tsx`, `web/src/app/api/auth/login/route.ts`).
- 2-space indentation with trailing commas in multi-line objects and arrays (e.g., `client/src/renderer/stores/chatStore.ts`, `web/tests/e2e/mocks.ts`).

**Linting:**
- ESLint config exists for the web app via `web/eslint.config.mjs` and is invoked by `web/package.json`.
- Client lint script runs ESLint across the client package (`client/package.json`), and inline rule disables appear in main process files (e.g., `client/src/main/index.ts`).

## Import Organization

**Order:**
1. External packages first, then local modules (e.g., `client/src/renderer/components/AvatarSelector.tsx`, `web/src/app/page.tsx`).
2. Type-only imports use `import type` or inline `type` specifiers (e.g., `client/src/renderer/lib/api.ts`, `client/src/renderer/components/AvatarSelector.tsx`).
3. Main-process local imports include `.js` extensions to satisfy ESM resolution (e.g., `client/src/main/index.ts`, `client/src/main/gateway-bridge.ts`).

**Path Aliases:**
- Web app alias `@/*` -> `src/*` is configured and used (e.g., `web/tsconfig.json`, `web/src/app/page.tsx`, `web/src/app/api/devices/route.ts`).
- Client renderer alias `@/*` -> `src/renderer/*` is configured but renderer code uses relative paths (e.g., `client/tsconfig.json`, `client/src/renderer/components/AvatarSelector.tsx`, `client/src/renderer/stores/chatStore.ts`).

## Error Handling

**Patterns:**
- API routes use `try/catch` and return `NextResponse.json` with status codes (e.g., `web/src/app/api/devices/route.ts`, `web/src/app/api/auth/login/route.ts`).
- Renderer stores guard on missing `window` APIs and log failures (e.g., `client/src/renderer/stores/chatStore.ts`, `client/src/renderer/stores/settingsStore.ts`).
- Hooks and stores short-circuit invalid input before async calls (e.g., `client/src/renderer/hooks/useTTS.ts`, `client/src/renderer/stores/chatStore.ts`).

## Logging

**Framework:** `electron-log` in the main process (e.g., `client/src/main/logger.ts`, `client/src/main/index.ts`).

**Patterns:**
- Renderer and hooks use `console.warn`/`console.error` with tagged prefixes (e.g., `client/src/renderer/stores/chatStore.ts`, `client/src/renderer/hooks/useTTS.ts`).
- Web API routes log errors via `console.error` (e.g., `web/src/app/api/devices/route.ts`, `web/src/app/api/auth/login/route.ts`).

## Comments

**When to Comment:**
- File-level docblocks and section headers explain purpose and rationale (e.g., `client/src/renderer/hooks/useTTS.ts`, `client/src/renderer/components/AvatarSelector.tsx`, `client/src/main/index.ts`).
- Inline comments clarify non-obvious behavior or side effects (e.g., `client/src/renderer/stores/chatStore.ts`, `web/tests/e2e/mocks.ts`).

**JSDoc/TSDoc:**
- Used mainly for file headers and property notes inside interfaces (e.g., `client/src/renderer/hooks/useTTS.ts`, `client/src/renderer/stores/chatStore.ts`).

## Function Design

**Size:** Prefer focused functions with early returns and scoped helpers (e.g., `client/src/renderer/hooks/useTTS.ts`, `web/src/app/api/auth/login/route.ts`).

**Parameters:** Use typed parameters and narrow unions for state/actions (e.g., `client/src/renderer/stores/settingsStore.ts`, `client/src/renderer/stores/chatStore.ts`).

**Return Values:** Async store actions and route handlers return promises; cleanup functions are returned when needed (e.g., `client/src/renderer/stores/settingsStore.ts`, `web/src/app/api/devices/route.ts`).

## Module Design

**Exports:**
- Default exports for Next.js pages and some services (e.g., `web/src/app/page.tsx`, `web/src/app/(admin)/layout.tsx`, `client/src/renderer/lib/api.ts`).
- Named exports for Zustand stores and shared types (e.g., `client/src/renderer/stores/chatStore.ts`, `client/src/renderer/stores/settingsStore.ts`).

**Barrel Files:** Index entrypoints are used for module roots rather than broad barrels (e.g., `client/src/preload/index.ts`, `client/src/renderer/i18n/index.ts`).

---

*Convention analysis: 2026-04-03*

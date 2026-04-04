# Testing Patterns

**Analysis Date:** 2026-04-03

## Test Framework

**Runner:**
- Vitest ^2.1.9 for unit tests, configured in `client/vitest.config.ts` and versioned in `client/package.json`.
- Playwright ^1.58.2 for E2E tests, configured in `client/playwright.config.ts` and `web/playwright.config.ts` with versions in `client/package.json` and `web/package.json`.

**Assertion Library:**
- Vitest `expect` for unit tests (e.g., `client/src/renderer/stores/chatStore.test.ts`, `client/src/renderer/hooks/useTTS.test.tsx`).
- Playwright `expect` for E2E tests (e.g., `client/e2e/chat.spec.ts`, `web/tests/e2e/landing.spec.ts`).

**Run Commands:**
```bash
cd client && npm run test           # from client/package.json
cd client && npm run test:e2e        # from client/package.json
cd web && npx playwright test        # uses web/playwright.config.ts
```

## Test File Organization

**Location:**
- Unit tests are co-located with renderer code in `client/src/renderer/.../*.test.ts(x)` (e.g., `client/src/renderer/stores/chatStore.test.ts`, `client/src/renderer/hooks/useTTS.test.tsx`).
- Client E2E tests live in `client/e2e/*.spec.ts` (e.g., `client/e2e/chat.spec.ts`).
- Web E2E tests live in `web/tests/e2e/*.spec.ts` (e.g., `web/tests/e2e/landing.spec.ts`, `web/tests/e2e/portal.spec.ts`).

**Naming:**
- Unit tests use `*.test.ts` / `*.test.tsx` (e.g., `client/src/renderer/stores/settingsStore.test.ts`, `client/src/renderer/hooks/useTTS.test.tsx`).
- E2E tests use `*.spec.ts` (e.g., `client/e2e/chat.spec.ts`, `web/tests/e2e/landing.spec.ts`).

**Structure:**
```
client/src/renderer/
├── hooks/useTTS.test.tsx
├── stores/chatStore.test.ts
└── stores/settingsStore.test.ts
client/e2e/
├── chat.spec.ts
└── app.spec.ts
web/tests/e2e/
├── landing.spec.ts
└── portal.spec.ts
```

## Test Structure

**Suite Organization:**
Example from `client/src/renderer/stores/settingsStore.test.ts`.
```typescript
describe('settingsStore', () => {
  it('loads settings', async () => {})
})
```

**Patterns:**
- Use `beforeEach`/`afterEach` for setup and cleanup with `vi.clearAllMocks`/`vi.restoreAllMocks` (e.g., `client/src/renderer/stores/chatStore.test.ts`, `client/src/renderer/stores/settingsStore.test.ts`).
- Playwright navigation waits rely on `page.goto()` and `page.waitForLoadState('networkidle')` (e.g., `web/tests/e2e/landing.spec.ts`, `web/tests/e2e/portal.spec.ts`).

## Mocking

**Framework:** Vitest `vi` for unit mocks and Playwright route intercepts for E2E (e.g., `client/src/renderer/stores/chatStore.test.ts`, `web/tests/e2e/mocks.ts`).

**Patterns:**
Examples from `client/src/renderer/stores/chatStore.test.ts` and `web/tests/e2e/landing.spec.ts`.
```typescript
vi.stubGlobal('window', { openclaw: mock, electronAPI: mock })
```
```typescript
await page.route('/api/credits', route => route.fulfill({ status: 200 }))
```

**What to Mock:**
- External `window.openclaw` and `window.electronAPI` APIs in unit tests (e.g., `client/src/renderer/stores/chatStore.test.ts`, `client/src/renderer/hooks/useTTS.test.tsx`).
- HTTP APIs in web E2E using centralized `applyMocks(page)` (e.g., `web/tests/e2e/mocks.ts`, `web/tests/e2e/landing.spec.ts`).

**What NOT to Mock:**
- Internal Zustand stores are imported directly in unit tests (note in `client/src/renderer/stores/chatStore.test.ts`).

## Fixtures and Factories

**Test Data:**
- Mock factory for Electron APIs lives in `client/src/test/mocks/electronAPI.ts`.
- Web E2E data is defined inline in `web/tests/e2e/mocks.ts`.

**Location:**
- Unit-test mocks under `client/src/test/mocks` (e.g., `client/src/test/mocks/electronAPI.ts`).
- E2E mocks centralized in `web/tests/e2e/mocks.ts`.

## Coverage

**Requirements:** Coverage is configured for renderer hooks/stores via v8 provider (e.g., `client/vitest.config.ts`).

**View Coverage:**
```bash
cd client && npx vitest run --coverage    # uses client/vitest.config.ts
```

## Test Types

**Unit Tests:**
- Renderer hooks and stores via Vitest (e.g., `client/src/renderer/hooks/useTTS.test.tsx`, `client/src/renderer/stores/chatStore.test.ts`).

**Integration Tests:**
- Not detected beyond E2E; tests are either unit or full E2E (e.g., `client/src/renderer/stores/chatStore.test.ts`, `web/tests/e2e/portal.spec.ts`).

**E2E Tests:**
- Client UI E2E with Playwright in `client/e2e/*.spec.ts` (e.g., `client/e2e/chat.spec.ts`).
- Web portal/landing E2E with Playwright in `web/tests/e2e/*.spec.ts` (e.g., `web/tests/e2e/landing.spec.ts`).

## Common Patterns

**Async Testing:**
- `async` tests with `await` on Playwright navigation and assertions (e.g., `web/tests/e2e/landing.spec.ts`, `client/e2e/chat.spec.ts`).
- `async` store tests using `await` on store actions (e.g., `client/src/renderer/stores/settingsStore.test.ts`, `client/src/renderer/stores/chatStore.test.ts`).

**Error Testing:**
- Mock error responses with `mockResolvedValue({ success: false })` (e.g., `client/src/renderer/hooks/useTTS.test.tsx`).
- E2E error-path assertions for invalid API key or missing data (e.g., `client/e2e/chat.spec.ts`, `web/tests/e2e/landing.spec.ts`).

---

*Testing analysis: 2026-04-03*

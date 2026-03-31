# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**E2E Framework:** Playwright (`@playwright/test`) ^1.41.0

**Config:** `client/playwright.config.ts`

**Run Commands:**
```bash
cd client && pnpm exec playwright test              # Run all tests
cd client && pnpm exec playwright test --ui        # Run with Playwright UI
cd client && pnpm exec playwright test --headed     # Run with browser visible
```

**No Unit Test Framework Detected:**
- No Vitest, Jest, or other unit testing framework configured
- No `*.test.ts` or `*.spec.ts` unit tests in `src/` directory
- All testing is E2E only

---

## Test File Organization

**Location:** `client/e2e/*.spec.ts`

**Naming:** `*.spec.ts` pattern

**Structure:**
```
client/e2e/
├── app.spec.ts            # App shell, window controls, file API
├── exec-approval.spec.ts   # Exec approval modal integration
├── tts.spec.ts            # Text-to-speech feature
├── avatar.spec.ts         # Avatar/agent feature
└── landing-page.spec.ts   # Landing page E2E
```

---

## Test File Analysis

### `client/e2e/app.spec.ts` (143 lines)

**Tests (6 tests):**
- `should load the application without errors` — Checks `#root` or `[data-testid="app"]` is visible
- `should display the header with connection status` — Verifies header and status indicator
- `should have functional sidebar tabs` — Clicks through 分身 / IM 频道 / 定时任务 tabs
- `should toggle sidebar collapse` — Tests collapse/expand button
- `should open settings modal` — Clicks settings button, checks for dialog
- `should display chat input` — Verifies chat input exists
- `should handle window controls via electronAPI` — Checks `window.electronAPI` exists
- `should have openclaw API available` — Checks `window.openclaw` type
- `should have file API methods defined` — Verifies `read`, `write`, `list` methods exist

**Pattern:** Uses `page.locator()` + `expect().toBeVisible()` / `toBeTruthy()`

---

### `client/e2e/exec-approval.spec.ts` (211 lines)

**Tests (6 tests):**
- `exec approval store exposes required API` — Verifies root element and modal container
- `modal is not visible by default` — Checks exec approval modal absent initially
- `command display renders correctly when triggered` — Injects CustomEvent to trigger modal
- `approve button sends approved resolution` — Clicks approve, checks modal closes
- `deny button closes modal without approval` — Clicks deny, checks modal closes
- `environment variables section expands when env is present` — Tests sensitive env masking
- `multiple approvals queue correctly` — Tests approval queueing

**Pattern:** Dispatches `CustomEvent('openclaw:event')` to simulate Gateway events:
```typescript
await page.evaluate(() => {
  const event = new CustomEvent('openclaw:event', {
    detail: {
      event: 'exec.approval.requested',
      payload: { id: 'test-approval-001', command: 'rm -rf /tmp/test-dir' },
    },
  })
  window.dispatchEvent(event)
})
```

---

### `client/e2e/tts.spec.ts`

**Not reviewed** — Could not read file.

### `client/e2e/avatar.spec.ts`

**Not reviewed** — Could not read file.

### `client/e2e/landing-page.spec.ts`

**Not reviewed** — Could not read file.

---

## Playwright Config Review

**File:** `client/playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,        // Fail on `test.only` in CI
  retries: process.env.CI ? 2 : 0,    // Retry 2x in CI, no retries locally
  workers: process.env.CI ? 1 : undefined,  // Serial in CI for stability
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',           # Capture trace on first retry
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,                  # 2-minute startup timeout
  },
})
```

**Observations:**
- Only Chromium browser tested (no Firefox/Safari)
- `reuseExistingServer: !process.env.CI` — Dev server reused in dev, forced fresh in CI
- HTML reporter only (no JUnit/XML for CI integration)
- Missing: `screenshot: 'only-on-failure'` for debugging
- Missing: `video: 'retain-on-failure'` for CI artifacts
- Missing: `headless: true` explicit config

---

## Coverage Analysis

### Covered (E2E)

| Feature | Coverage | File |
|---------|----------|------|
| App shell loading | Basic | `app.spec.ts` |
| Header / connection status | Basic | `app.spec.ts` |
| Sidebar tabs | Basic | `app.spec.ts` |
| Settings modal | Basic | `app.spec.ts` |
| Chat input presence | Basic | `app.spec.ts` |
| Window API availability | Basic | `app.spec.ts` |
| File API methods | Basic | `app.spec.ts` |
| Exec approval modal open/close | Medium | `exec-approval.spec.ts` |
| Command display | Medium | `exec-approval.spec.ts` |
| Env variable masking | Medium | `exec-approval.spec.ts` |
| Approval queueing | Medium | `exec-approval.spec.ts` |
| TTS feature | Unknown | `tts.spec.ts` |
| Avatar feature | Unknown | `avatar.spec.ts` |
| Landing page | Unknown | `landing-page.spec.ts` |

### NOT Covered (Critical Gaps)

| Area | Risk | Priority |
|------|------|----------|
| **Zustand stores** — No unit tests for `appStore`, `chatStore`, `taskStore`, `execApprovalStore`, `avatarStore`, `toastStore`, `openclawStore`, `settingsStore` | Bug in state management goes undetected | HIGH |
| **IPC handlers** — No tests for `gateway.ts`, `file.ts`, `shell.ts`, `app.ts`, `clawhub.ts` | Broken IPC breaks entire app | HIGH |
| **Gateway bridge** — No tests for `gateway-bridge.ts` connection logic | Connection failures undetected | HIGH |
| **Error paths** — No tests for error handling in any IPC handler | Errors silently fail | HIGH |
| **Settings persistence** — No tests for electron-store operations | Settings data loss | MEDIUM |
| **File validation** — No tests for path validation logic | Security bypass risk | HIGH |
| **i18n** — No tests for translation function or missing keys | Untranslated strings | MEDIUM |
| **Voice/STT hooks** — No tests for `useSpeechRecognition.ts`, `useTTS.ts` | Voice features untested | MEDIUM |
| **React components** — No unit tests for any UI component | Regression risk | HIGH |
| **Main process lifecycle** — No tests for app startup, tray, notifications, updater | Critical path untested | HIGH |
| **Optimistic updates** — No tests for task store rollback logic | State corruption | MEDIUM |
| **Preload API** — Only type-checking, no behavioral tests | API contract untested | MEDIUM |

---

## Test Data and Fixtures

**Fixtures:** None detected in `client/e2e/`

**Test Data Patterns:**
```typescript
// From exec-approval.spec.ts — inline CustomEvent payloads
const event = new CustomEvent('openclaw:event', {
  detail: {
    event: 'exec.approval.requested',
    payload: {
      id: 'test-approval-001',
      command: 'rm -rf /tmp/test-dir',
      env: { NODE_ENV: 'production', API_SECRET: 'super-secret-key-123' },
      nodeId: undefined,
    },
  },
})
```

**Test Session Data:**
- No mock Gateway responses — tests rely on real Gateway (or fail gracefully)
- No mock IPC — tests dispatch events directly to simulate Gateway
- No test fixtures/factories for creating consistent test data

---

## Flaky Test Patterns

**Potential Issues:**

1. **Gateway dependency:** Most E2E tests require a running OpenClaw Gateway. Tests will fail or hang if Gateway is unavailable.

2. **Timing sensitivity:**
```typescript
// exec-approval.spec.ts
await page.waitForTimeout(800)  // Hardcoded wait — may be flaky on slow machines
await page.waitForTimeout(400)  // Even shorter — fragile
```

3. **Network idle assumption:**
```typescript
await page.waitForLoadState('networkidle')  // May timeout if Gateway takes long
```

4. **Conditional visibility:**
```typescript
// app.spec.ts — conditional test (may pass or fail depending on state)
if (await collapseButton.isVisible()) {
  // test logic
}
```

5. **CI config inconsistency:** `retries: process.env.CI ? 2 : 0` means flakiness is hidden locally but exposed in CI.

---

## Recommendations for Additional Testing

### HIGH Priority

1. **Zustand Store Unit Tests**
   - Test state transitions in `chatStore`, `taskStore`, `execApprovalStore`
   - Test optimistic update/rollback logic in `taskStore`
   - Test error handling paths

2. **IPC Handler Tests**
   - Mock the Gateway bridge to test IPC handlers in isolation
   - Test error propagation from Gateway to renderer

3. **Path Validation Security Tests**
   - Test that unauthorized paths are rejected
   - Test path traversal attacks are blocked

### MEDIUM Priority

4. **i18n Coverage Test**
   - Scan all components for hardcoded strings not in i18n
   - Verify all `t()` keys exist in both zh/en translation files

5. **React Component Unit Tests**
   - Use `@testing-library/react` for component rendering tests
   - Test `ExecApprovalModal` rendering with various approval states
   - Test `MessageBubble` with different message types

6. **Voice Hook Tests**
   - Mock Web Speech API to test `useSpeechRecognition`
   - Mock TTS API to test `useTTS`

### LOW Priority

7. **E2E Test Fixture Library**
   - Create shared fixtures for approval events, session data, model responses
   - Reduce duplication in `exec-approval.spec.ts`

8. **Screenshot/Video Artifacts**
   - Enable `screenshot: 'only-on-failure'` and `video: 'retain-on-failure'` in playwright config
   - Publish artifacts to CI

9. **Firefox/Safari Coverage**
   - Add Firefox and Safari to playwright `projects` array for cross-browser testing

---

*Testing analysis: 2026-03-31*

# ROADMAP.md — SynClaw v1.3

**v1.2 Archive:** [v1.2 Milestone Archive](./milestones/v1.2-MILESTONE-ARCHIVE.md) — 27/32 requirements satisfied

**Current milestone:** v1.3 首发就绪冲刺 (Launch-Ready Sprint)
**Previous milestone:** v1.2 — [Archive](./milestones/v1.2-MILESTONE-ARCHIVE.md)

---

## Phases

- [x] **Phase 10: TEST-UNIT** — Vitest setup + unit tests for 5 core stores/hooks ✅
- [x] **Phase 11: TEST-E2E** — Chat E2E + Playwright CI config ✅
- [ ] **Phase 12: UX-POLISH** — Empty states + loading skeletons + keyboard shortcuts
- [ ] **Phase 13: SECURITY** — electron-store encryption guide + WEB_API_BASE graceful degradation
- [ ] **Phase 14: DEPLOY** — macOS signing UI + README signing guide + electron-builder config

---

## Phase Details

### Phase 10: TEST-UNIT

**Goal:** Establish Vitest testing infrastructure and achieve unit test coverage for 5 core stores/hooks.

**Depends on:** None (foundation work)

**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06

**Success Criteria** (what must be TRUE):
1. `pnpm test` runs Vitest with jsdom environment and passes all tests
2. `chatStore` tests verify sendMessage, message addition, MAX_MESSAGES cap, and Gateway event handling
3. `settingsStore` tests verify theme switching, hasCompletedOnboarding persistence, and cross-window sync
4. `avatarStore` tests verify activateAvatar, setActiveAvatar sync, and demo mode fallback
5. `execApprovalStore` tests verify approval queue, approve/deny/approve-once decisions, and timeout logic
6. `useTTS` hook tests verify play/stop/pause/resume and currentWordIndex updates

**Plans:** 1 plan

Plans:
- [ ] 10-test-unit/10-PLAN.md — Vitest setup + unit tests for 5 core stores/hooks

---

### Phase 11: TEST-E2E

**Goal:** Add end-to-end tests for core chat flow with Playwright CI configuration.

**Depends on:** Phase 10 (TEST-UNIT)

**Requirements:** TEST-07, TEST-08

**Success Criteria** (what must be TRUE):
1. E2E test sends a message and verifies AI response displays in chat
2. E2E test submits empty message and verifies no action is triggered
3. E2E test with invalid API key shows error message gracefully
4. Playwright CI configuration runs in headless mode with Gateway mocked
5. `pnpm test:e2e` passes in CI environment with 2 retries for flaky tests

**Plans:** ✅ COMPLETED
- `11-test-e2e/gateway-mock.cjs` — Gateway mock for E2E (CommonJS, injected via setupFiles)
- `11-test-e2e/chat.spec.ts` — 7 E2E tests covering chat flow, Enter key, and Gateway API

---

### Phase 12: UX-POLISH

**Goal:** Provide guidance UI for all empty states, loading feedback, and keyboard shortcuts.

**Depends on:** Phase 10 (TEST-UNIT)

**Requirements:** UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09

**Success Criteria** (what must be TRUE):
1. TaskBoard shows "开启你的第一个任务" title with create button CTA when empty
2. IMPanel shows "开始新对话" guide with CTA when no sessions exist
3. AvatarListPanel shows "一键创建" buttons for 5 built-in templates when no avatars
4. McpPanel shows setup guide with quick template entry when no servers configured
5. ChatView displays skeleton loading animation above input area while AI is responding
6. Cmd+, opens settings panel from anywhere in the app
7. Escape closes the topmost open modal/panel (LIFO stack order)
8. Cmd+Shift+S toggles sidebar expand/collapse
9. Cmd+/ opens keyboard shortcuts reference modal showing all available shortcuts

**Plans:** TBD

**UI hint:** yes

---

### Phase 13: SECURITY

**Goal:** Enable electron-store encryption with migration path and make WEB_API_BASE optional.

**Depends on:** Phase 10 (TEST-UNIT)

**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04

**Success Criteria** (what must be TRUE):
1. Settings→Security panel displays warning when encryption is not enabled
2. Settings→Security panel guides user to set STORE_ENCRYPTION_KEY and enables encryption
3. Existing plaintext data migrates to encrypted store when user enables encryption
4. App starts successfully when WEB_API_BASE is not configured
5. web:register, web:report-usage, and web:revoke handlers return `{ skipped: true }` without error when WEB_API_BASE is unset

**Plans:** TBD

---

### Phase 14: DEPLOY

**Goal:** Make macOS code signing transparent with user-configurable credentials and clear documentation.

**Depends on:** Phase 13 (SECURITY)

**Requirements:** DEPLOY-01, DEPLOY-02, DEPLOY-03

**Success Criteria** (what must be TRUE):
1. Settings→About panel displays macOS signing status (signed/not signed/signing)
2. Settings→About panel shows "配置签名" button that opens configuration guide
3. README.md contains clear signing configuration section explaining how to set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID
4. electron-builder.yml has notarize: autoSubmit: true configured for automatic signing when credentials are provided

**Plans:** TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. TEST-UNIT | 1/1 | COMPLETED | 2026-04-01 |
| 11. TEST-E2E | 1/1 | COMPLETED | 2026-04-01 |
| 12. UX-POLISH | 0/1 | Not started | - |
| 13. SECURITY | 0/1 | Not started | - |
| 14. DEPLOY | 0/1 | Not started | - |

---

*Roadmap created: 2026-04-01 for v1.3 首发就绪冲刺*

# ROADMAP.md — SynClaw v1.4

**v1.3 Archive:** [v1.3 Milestone Archive](./milestones/v1.3-MILESTONE-ARCHIVE.md) — 5/5 phases, 23/23 requirements ✅

**Current milestone:** v1.4 安全加固冲刺 (Security Hardening Sprint) — ⬜ IN PROGRESS
**Previous milestone:** v1.3 — [Archive](./milestones/v1.3-MILESTONE-ARCHIVE.md)

---

## Phases

- [x] **Phase 15: SHELL-SECURITY** — shell:openExternal 协议白名单 ✅
- [ ] **Phase 16: SANDBOX** — OpenClaw Sandbox 完整对接
- [ ] **Phase 17: AUDIT** — Security Audit UI + CI 版本扫描
- [ ] **Phase 18: FONTS** — 移除 Google Fonts CDN
- [ ] **Phase 19: NOTARY** — macOS 公证提交（需用户 Apple ID）

---

## Phase Details

### Phase 15: SHELL-SECURITY

**Goal:** 修复 shell:openExternal 协议白名单，防止 `javascript:` 和 `data:` 协议攻击。

**Depends on:** None (foundation work)

**Requirements:** SHELL-01, SHELL-02, SHELL-03, SHELL-04

**Success Criteria** (what must be TRUE):
1. `shell:openExternal('javascript:alert(1)')` 被白名单拦截，不打开任何窗口
2. `shell:openExternal('data:text/html,<script>alert(1)</script>')` 被白名单拦截
3. `shell:openExternal('https://example.com')` 正常打开
4. `shell:openExternal('mailto:test@example.com')` 正常打开
5. 白名单拦截时显示 toast 提示用户

---

### Phase 16: SANDBOX

**Goal:** 对接 OpenClaw Sandbox 配置，exec 工具在子进程隔离运行，网络访问禁用。

**Depends on:** None (foundation work)

**Requirements:** SBX-01, SBX-02, SBX-03, SBX-04

**Success Criteria** (what must be TRUE):
1. Gateway 启动时应用 sandbox config（mode: non-main）
2. 沙箱内网络访问被禁用
3. 沙箱内根目录为只读
4. SecurityPanel 显示 Sandbox 开关，默认开启

---

### Phase 17: AUDIT

**Goal:** 对接 `openclaw security audit` CLI，在 SynClaw UI 中展示安全审计结果。

**Depends on:** Phase 15 (SHELL-SECURITY)

**Requirements:** AUD-01, AUD-02, AUD-03

**Success Criteria** (what must be TRUE):
1. 运行时调用 `openclaw security audit --json` 并解析输出
2. SecurityPanel 新增「安全审计」卡片展示 CVE 影响评估
3. CI 中运行 OpenClaw 版本检查，检查已知漏洞版本

---

### Phase 18: FONTS

**Goal:** 移除 Google Fonts CDN 加载，保护用户隐私。

**Depends on:** None (foundation work)

**Requirements:** FNT-01, FNT-02

**Success Criteria** (what must be TRUE):
1. `globals.css` 和所有组件中无 Google Fonts CDN import
2. 使用系统字体栈或打包字体作为 fallback

---

### Phase 19: NOTARY

**Goal:** 完成 macOS 公证，让 SynClaw 通过 Gatekeeper 检查。

**Depends on:** Phase 15 (SHELL-SECURITY)

**Requirements:** NOT-01, NOT-02

**Success Criteria** (what must be TRUE):
1. `electron-builder` 使用用户提供的 Apple ID 提交公证
2. 公证完成后 `.app` 包通过 `spctl -a -t exec -vv` Gatekeeper 验证

---

## Progress Table

| Phase | Name | Requirements | Status | Completed |
|-------|------|-------------|--------|-----------|
| 10. TEST-UNIT | Unit tests | TEST-01–06 | ✅ COMPLETED | 2026-04-01 |
| 11. TEST-E2E | E2E tests | TEST-07–08 | ✅ COMPLETED | 2026-04-01 |
| 12. UX-POLISH | UX polish | UX-01–09 | ✅ COMPLETED | 2026-04-01 |
| 13. SECURITY | Security hardening | SEC-01–04 | ✅ COMPLETED | 2026-04-01 |
| 14. DEPLOY | Distribution | DEPLOY-01–03 | ✅ COMPLETED | 2026-04-01 |
| 15. SHELL-SECURITY | Protocol whitelist | SHELL-01–04 | ✅ COMPLETED | 2026-04-05 |
| 16. SANDBOX | Sandbox integration | SBX-01–04 | ⬜ PENDING | — |
| 17. AUDIT | Security audit UI | AUD-01–03 | ⬜ PENDING | — |
| 18. FONTS | Fonts privacy | FNT-01–02 | ⬜ PENDING | — |
| 19. NOTARY | macOS notarization | NOT-01–02 | ⬜ PENDING | — |

---

*Roadmap created: 2026-04-05 for v1.4 安全加固冲刺*


---

## Phases

- [x] **Phase 10: TEST-UNIT** — Vitest setup + unit tests for 5 core stores/hooks ✅
- [x] **Phase 11: TEST-E2E** — Chat E2E + Playwright CI config ✅
- [x] **Phase 12: UX-POLISH** — Empty states + loading skeletons + keyboard shortcuts ✅
- [x] **Phase 13: SECURITY** — electron-store encryption guide + WEB_API_BASE graceful degradation ✅
- [x] **Phase 14: DEPLOY** — macOS signing UI + README signing guide + electron-builder config ✅

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

**Plans:** ✅ COMPLETED
- `10-test-unit/10-PLAN.md` — Vitest setup + unit tests for 5 core stores/hooks ✅

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

**Plans:** ✅ COMPLETED
- `12-ux-polish/12-PLAN.md` — Full task plan for all 9 UX requirements
- `TaskBoard.tsx` — Empty state with ClawLogo + "开启你的第一个任务" + create CTA
- `IMPanel.tsx` — Empty state text updated to "开始新对话"
- `AvatarListPanel.tsx` — 5 template quick-create cards using AVATAR_TEMPLATES
- `McpPanel.tsx` — Empty state merged with quick template grid
- `ChatView.tsx` — Skeleton loading animation (user + 2 assistant bubbles)
- `App.tsx` — Cmd+, Cmd+Shift+S, Escape LIFO, Cmd+/, ShortcutsModal component

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

**Plans:** ✅ COMPLETED
- `13-security/13-PLAN.md` — Full task plan for all 4 SEC requirements
- `ipc-handlers/security.ts` — 3 IPC handlers (status, generateKey, setWebApiBase)
- `ipc-handlers/web.ts` — Lazy WEB_API_BASE init, graceful skip in web:register
- `app-settings.ts` — Added security.webApiBase + security.encryptionEnabled fields
- `SecurityPanel.tsx` — Encryption status + key modal + WEB_API_BASE config UI
- `electron.d.ts` — Added security to ElectronAPI + AppSettings types

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

**Plans:** ✅ COMPLETED
- `14-deploy/14-PLAN.md` — Plan for DEPLOY requirements
- `ipc-handlers/shell.ts` — Added `app:getSigningStatus` handler with `codesign -d` detection
- `preload/index.ts` — Added `app.getSigningStatus()` bridge
- `electron.d.ts` — Added `getSigningStatus` to ElectronAPI interface
- `AboutPanel.tsx` — Signing status card: signed (green shield), unsigned (orange alert + guide button), not_macos (info)
- README.md — Already has complete signing guide (lines 132-185)
- electron-builder.yml — Already has `notarize: autoSubmit: true` (line 64-67)

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. TEST-UNIT | 1/1 | COMPLETED | 2026-04-01 |
| 11. TEST-E2E | 1/1 | COMPLETED | 2026-04-01 |
| 12. UX-POLISH | 1/1 | COMPLETED | 2026-04-01 |
| 13. SECURITY | 1/1 | COMPLETED | 2026-04-01 |
| 14. DEPLOY | 1/1 | COMPLETED | 2026-04-01 |

---

*Roadmap created: 2026-04-01 for v1.3 首发就绪冲刺*

# ROADMAP — v1.7 Backlog 清理 + 性能优化

**Milestone:** v1.7
**Created:** 2026-04-07
**Phases:** 5 | **Requirements:** 20 | **Covered:** 20/20 ✓

---

## Phases

- [x] **Phase 26: Onboarding + Gateway 状态** — API key 验证 + 断连 banner + 状态显示 (completed 2026-04-07)
- [x] **Phase 27: 空状态补全** — 4 个面板的空状态引导 (completed 2026-04-07)
- [ ] **Phase 28: UX 补全** — Avatar 状态、快捷键、Toast、CLI 检测、降级
- [ ] **Phase 29: 性能优化（启动 + IPC）** — 启动链路 + IPC 批量 + 缓存
- [ ] **Phase 30: 性能优化（React + 内存）** — 重渲染 + 虚拟化 + 内存泄漏

---

## Phase Details

### Phase 26: Onboarding + Gateway 状态

**Goal:** 用户可以清楚知道 Gateway 连接状态并在连接失败时快速重连

**Depends on:** None

**Requirements:** ONB-01, GATE-01, GATE-02

**Success Criteria** (what must be TRUE):
1. User saves API key in onboarding and immediately sees "连接成功" or "连接失败" status after `gateway.ping()` call
2. User sees a prominent disconnect banner in ChatView when Gateway disconnects unexpectedly
3. User can click "重新连接" button on the banner to attempt reconnection
4. User can see Gateway status (connected/disconnected/error), OpenClaw version, and connection address in GatewayPanel

**Plans:** 4/4 plans complete
- [x] 26-01-PLAN.md — Gateway 连接状态 Hook（Zustand store + useGatewayStatus）
- [x] 26-02-PLAN.md — 断连 Banner UI（ChatView DisconnectBanner）
- [x] 26-03-PLAN.md — Onboarding API Key 验证（gateway.ping 集成）
- [x] 26-04-PLAN.md — GatewayPanel 状态显示（增强版）

**Status:** ✅ Complete

**UI hint:** yes

---

### Phase 27: 空状态补全

**Goal:** 用户在空面板看到清晰的引导 CTA，不再面对空白界面

**Depends on:** None (independent UI components)

**Requirements:** EMPTY-01, EMPTY-02, EMPTY-03, EMPTY-04

**Success Criteria** (what must be TRUE):
1. User sees "创建分身" CTA button in AvatarListPanel when no avatars exist
2. User sees "开启你的第一个任务" guidance in empty TaskBoard
3. User sees ClawHub CLI detection + installation guide in SkillsMarketPanel when CLI is not detected
4. User sees "添加 MCP server" guide in empty McpPanel

**Plans:** 4/4 plans executed

**Plan list:**
- [x] 27-01-PLAN.md — AvatarListPanel 空状态 CTA 增强
- [x] 27-02-PLAN.md — TaskBoard + SkillsMarketPanel 空状态验证
- [x] 27-03-PLAN.md — McpPanel 空状态增强
- [x] 27-04-PLAN.md — 全局空状态验收（人工）

**Status:** ✅ Complete

---

### Phase 28: UX 补全

**Goal:** 关键 UX 流程完善，提升用户操作反馈感知

**Depends on:** None (independent UX improvements)

**Requirements:** UX-01, UX-02, UX-03, UX-04, DEG-01, CLI-01

**Success Criteria** (what must be TRUE):
1. User sees current Avatar name displayed in ChatView Header after switching avatars
2. User's active chat resets Avatar state to "未选择" after deleting the current Avatar
3. User can use Cmd+, to open Settings, Escape to close any modal, Cmd+Shift+M to toggle voice mode
4. User sees toast notifications for these events: Gateway connect/disconnect, API key save, Avatar save, TTS play failure, approval timeout
5. User sees friendly ClawHub CLI installation guidance in SkillsMarketPanel when CLI is not installed (not silent failure)
6. User can still use main app features (chat, file ops) when WEB_API_BASE API is unavailable

**Plans:** 2/5 plans executed

**UI hint:** yes

---

### Phase 29: 性能优化（启动 + IPC）

**Goal:** 提升应用启动速度，降低 IPC 通信延迟

**Depends on:** None (independent technical work)

**Requirements:** PERF-01, PERF-02, PERF-03, PERF-04

**Success Criteria** (what must be TRUE):
1. Developer can see Electron main process startup timing breakdown (module load, Gateway init, window creation phases)
2. User experiences measurably faster first screen paint (TTI improvement via lazy loading non-critical components)
3. Frequent gateway status polling requests are batched or deduplicated (no redundant IPC calls within 500ms window)
4. Hot gateway-bridge RPC methods return cached results when inputs unchanged

**Plans:** TBD

---

### Phase 30: 性能优化（React + 内存）

**Goal:** 提升 React 渲染效率，消除内存泄漏

**Depends on:** Phase 29 (needs baseline metrics first)

**Requirements:** PERF-05, PERF-06, PERF-07

**Success Criteria** (what must be TRUE):
1. Zustand stores only trigger re-renders for components subscribing to actually changed state (no unnecessary re-renders in React DevTools)
2. ChatView maintains smooth 60fps scrolling with 100+ messages (via virtualization)
3. No memory leaks detected after 30 minutes of active use (no growing heap in Chrome DevTools)

**Plans:** TBD

---

## Progress Table

| Phase | Name | Requirements | Plans | Status | Completed |
|-------|------|-------------|-------|--------|-----------|
| 26 | Onboarding + Gateway 状态 | ONB-01, GATE-01, GATE-02 | 4/4 | ✅ Complete | 2026-04-07 |
| 27 | 空状态补全 | EMPTY-01~04 | 4/4 | ✅ Complete | 2026-04-07 |
| 28 | UX 补全 | UX-01~04, DEG-01, CLI-01 | 0/6 | Not started | - |
| 29 | 性能优化（启动 + IPC） | PERF-01~04 | 0/4 | Not started | - |
| 30 | 性能优化（React + 内存） | PERF-05~07 | 0/3 | Not started | - |

---

## Coverage Map

| REQ-ID | Phase | Requirement |
|--------|-------|-------------|
| ONB-01 | Phase 26 | Onboarding API key 验证 |
| GATE-01 | Phase 26 | Gateway 断连 banner |
| GATE-02 | Phase 26 | GatewayPanel 状态显示 |
| EMPTY-01 | Phase 27 | AvatarListPanel 空状态 |
| EMPTY-02 | Phase 27 | TaskBoard 空状态 |
| EMPTY-03 | Phase 27 | SkillsMarketPanel 空状态 |
| EMPTY-04 | Phase 27 | McpPanel 空状态 |
| UX-01 | Phase 28 | Avatar Header 显示 |
| UX-02 | Phase 28 | Avatar 删除状态重置 |
| UX-03 | Phase 28 | 快捷键扩展 |
| UX-04 | Phase 28 | Toast 体系完整性 |
| DEG-01 | Phase 28 | WEB_API_BASE 降级 |
| CLI-01 | Phase 28 | ClawHub CLI 检测 |
| PERF-01 | Phase 29 | 启动链路分析 |
| PERF-02 | Phase 29 | 首屏渲染优化 |
| PERF-03 | Phase 29 | IPC 批量处理 |
| PERF-04 | Phase 29 | IPC 热点缓存 |
| PERF-05 | Phase 30 | Zustand selector 审查 |
| PERF-06 | Phase 30 | ChatView 虚拟化 |
| PERF-07 | Phase 30 | 内存泄漏排查 |

---

*Roadmap created: 2026-04-07 for v1.7 Backlog 清理 + 性能优化*

# ROADMAP.md — SynClaw v1.5 P2 架构与质量债

**v1.4 Archive:** [v1.4 Milestone Archive](./milestones/v1.4-ROADMAP.md) — 5/5 phases, 13/13 requirements ✅

**Current milestone:** v1.5 P2 架构与质量债 — 🚧 PLANNING
**Previous milestone:** v1.4 — [Archive](./milestones/v1.4-ROADMAP.md)

---

## Phases

### Phase 20: TypeScript 类型安全

**Status:** ✅ COMPLETE (2026-04-06)

**Goal:** 消除 `gateway-bridge.ts` 中的 `any`，IPC handler 参数与返回值全类型化，让 TypeScript 真正发挥类型安全作用。

**Depends on:** None (foundation work)

**Requirements:** TS-01, TS-02, TS-03

**Success Criteria** (what must be TRUE):
1. ✅ `gateway-bridge.ts` 中无 `@ts-expect-error` 或 `@ts-ignore` 注释
2. ✅ `gateway-bridge.ts` 中无 `require()` 动态调用，全部改为静态 `import`
3. ✅ 所有 IPC handler 函数签名声明具体类型（参数类型 + 返回值类型 `Promise<T>`）
4. ✅ `preload/index.ts` 中 `window.openclaw` 所有方法有完整 TypeScript 接口
5. ✅ `tsc --noEmit` 全程零错误

**Commits:** `2c46a433d`（包括新类型约束）

---

### 🚧 Phase 21: EventBus 统一事件监听

**Goal:** 合并 chatStore 和 openclawStore 的事件注册为统一 EventBus，并提供 React Context 封装。

**Depends on:** None (foundation work)

**Requirements:** EVT-01, EVT-02, EVT-03

**Success Criteria** (what must be TRUE):
1. ✅ `src/renderer/lib/eventBus.ts` 导出统一 EventBus，支持 `.on()` / `.off()` / `.once()` / `.emit()`
2. ✅ `useOpenClaw` Context 提供 `useOpenClaw()` hook
3. ✅ chatStore 中的 `window.openclaw.on()` 调用替换为 EventBus API
4. ✅ openclawStore 中的 `window.openclaw.on()` 调用替换为 EventBus API
5. ✅ 所有订阅在组件卸载时自动清理（无内存泄漏警告）

---

### Phase 22: 错误处理与监控

**Status:** ✅ COMPLETE (2026-04-06)

**Goal:** 添加 React ErrorBoundary 和 operation tracing，让 SynClaw 达到生产级稳定性标准。

**Depends on:** Phase 20 (TypeScript — for requestId typing)

**Requirements:** ERR-01, ERR-02, ERR-03, ERR-04

**Success Criteria** (what must be TRUE):
1. ✅ 顶层 App 组件存在 ErrorBoundary，任何组件渲染异常显示友好降级 UI
2. ✅ 每个 IPC 调用（经 bridge）携带 `requestId` UUID，日志输出包含 `{ requestId, method, args }`
3. ✅ exec 和 file 相关 RPC 调用有 10s 超时，超时后显示错误状态
4. ✅ exec 和 file 相关 RPC 调用失败后自动重试 1 次
5. ✅ main 进程 `process.on('uncaughtException')` 和 `process.on('unhandledRejection')` 通过 electron-log 记录到文件

**Commits:** `f3c0a47d1`

---

### Phase 23: Workspace 统一

**Status:** ✅ COMPLETE (2026-04-06)

**Goal:** FileExplorer 使用 OpenClaw Gateway workspace 路径，移除 electron-store 中的独立 workspace 配置。

**Depends on:** Phase 20 (TypeScript — for IPC typing)

**Requirements:** WS-01, WS-02, WS-03

**Success Criteria** (what must be TRUE):
1. ✅ `ipc-handlers/gateway.ts` 中 `workspace:get` handler 返回 `gateway.workspacePath`（调用 Gateway）
2. ⬜ FileExplorer 组件通过 `workspace:get` IPC 获取路径 — WS-02 部分实现
3. ✅ `electron-store` 中 `workspace.path` 配置项已移除 — N/A（无此 key）

**Commits:** `8a1dee35d`

---

## Progress Table

| Phase | Name | Requirements | Status | Completed |
|-------|------|-------------|--------|-----------|
| 20 | TypeScript 类型安全 | TS-01–03 | ✅ Complete | 2026-04-06 |
| 21 | EventBus 统一事件监听 | EVT-01–03 | ✅ Complete | 2026-04-06 |
| 22 | 错误处理与监控 | ERR-01–04 | ✅ Complete | 2026-04-06 |
| 23 | Workspace 统一 | WS-01–03 | ✅ Complete | 2026-04-06 |

---

*Roadmap created: 2026-04-06 for v1.5 P2 架构与质量债*

# Phase 21: EventBus 统一事件监听 - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — pure infrastructure phase)

<domain>
## Phase Boundary

Merge all `window.openclaw.on(...)` event registrations across the renderer into a unified `EventBus` module, then provide a `useEventBus` React Context. The EventBus becomes the single source of truth for Gateway events in the renderer.

**Requirements (from ROADMAP):**
- EVT-01: 创建统一 `EventBus` 模块
- EVT-02: 创建 `useOpenClaw` React Context（复用现有命名）
- EVT-03: 旧事件注册迁移到 EventBus API

**Success Criteria:**
1. `src/renderer/lib/eventBus.ts` 导出统一 EventBus，支持 `.on()` / `.off()` / `.once()` / `.emit()`
2. `useOpenClaw` Context 提供 `useOpenClaw()` hook
3. chatStore 中的 `window.openclaw.on()` 调用替换为 EventBus API
4. openclawStore 中的 `window.openclaw.on()` 调用替换为 EventBus API
5. 所有订阅在组件卸载时自动清理（无内存泄漏警告）

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Follow TypeScript best practices:
- Use discriminated union EventMap for type-safe event names and payloads
- Return `() => void` unsubscribe from `.on()` (mirrors existing patterns in codebase)
- ChatStore becomes the ONLY component that listens to raw `window.openclaw` events — it re-emits them through EventBus
- All other components (App, Sidebar, SkillsPanel, TaskBoard, etc.) become pure consumers via `useOpenClaw()` hook
- Keep `window.openclaw.onStatusChange()` separate since it's not a Gateway event

</decisions>

<code_context>
## Existing Code Insights

### Current Event Landscape (from scout)

**chatStore.ts — THE producer:**
- Listens to: `agent`, `chat`, `exec.approval.requested`, `exec.approval.resolved`, `device.pair.requested`, `device.pair.resolved`, `node.pair.requested`, `node.pair.resolved`, `node.invoke.request`, `tick`
- Manages its own cleanup via `_initCleanup` field (idempotency guard)
- Already exports `init()` returning cleanup fn

**openclawStore.ts — NO events:**
- Pure RPC consumer (`.getStatus()`, `.connect()`, `.disconnect()`)
- No `on()` calls

**App.tsx — consumer:**
- Listens to `window.openclaw.onStatusChange()` → sets `gatewayStatus`
- Listens to `window.electronAPI.onNavigate()` → opens dialogs
- Note: `onStatusChange` is NOT a Gateway event — it's our own IPC bridge broadcast

**Sidebar.tsx — consumer:**
- Listens to `window.openclaw.on('cron:triggered'/'cron:completed')` → reloads task list

**SkillsPanel.tsx — consumer:**
- Listens to `window.openclaw.on('skill:installed'/'skill:status-changed')` → reloads skills

**TaskBoard.tsx — consumer:**
- Listens to `window.openclaw.on('task:status-changed')` → reloads tasks

**ChatView.tsx — consumer:**
- Listens to `window.openclaw.onStatusChange()` → sets `connectionStatus`

### Established Patterns
- `.on()` always returns `() => void` unsubscribe function
- `useEffect` with cleanup fn is the standard React pattern
- Existing `ToastContext` in Toast.tsx is the only Context reference in the codebase

### Integration Points
- `App.tsx` wraps children in `<EventBusProvider>`
- `chatStore.init()` — register raw Gateway listeners and re-emit through EventBus
- All consumer components migrate to `useOpenClaw()` hook

</code_context>

<specifics>
## Specific Ideas

### EVT-01: EventBus 模块设计
Create `src/renderer/lib/eventBus.ts`:
```typescript
type EventHandler<T = unknown> = (payload: T) => void

class EventBusImpl {
  private listeners = new Map<string, Set<EventHandler>>()
  on<T>(event: string, handler: EventHandler<T>): () => void { ... }
  off<T>(event: string, handler: EventHandler<T>): void { ... }
  once<T>(event: string, handler: EventHandler<T>): void { ... }
  emit<T>(event: string, payload: T): void { ... }
}
export const eventBus = new EventBusImpl()
```

Type-safe wrapper with EventMap:
```typescript
type TypedEventBus = {
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void
  ...
}
```

### EVT-02: Context + Hook Design
Based on existing Toast.tsx pattern:
```typescript
// src/renderer/contexts/EventBusContext.tsx
const EventBusContext = createContext<EventBus | null>(null)
export function EventBusProvider({ children }) { ... }
export function useOpenClaw(): EventBus { ... }
// Note: naming "useOpenClaw" per requirement, NOT "useEventBus"
```

### EVT-03: Migration Strategy
1. Create EventBus + Context
2. Wrap App in `<EventBusProvider>`
3. chatStore.init() → use `eventBus.emit()` for its existing handlers
4. Migrate consumers one by one: Sidebar → SkillsPanel → TaskBoard → ChatView → GatewayPanel
5. Each migration: replace `window.openclaw.on(event, cb)` with `eventBus.on(event, cb)`
6. Keep `window.openclaw.onStatusChange()` and `window.electronAPI.onNavigate()` as-is (not Gateway events)
</specifics>

<deferred>
## Deferred Ideas
None — discussion stayed within phase scope.
</deferred>

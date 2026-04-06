# Phase 20: TypeScript 类型安全 - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — pure infrastructure phase)

<domain>
## Phase Boundary

Eliminate all `any` types in `gateway-bridge.ts` and type all IPC handler function signatures. The goal is full TypeScript type safety across the bridge layer: bridge → IPC handlers → preload.

**Requirements (from ROADMAP):**
- TS-01: `gateway-bridge.ts` 动态 import → 静态 import，消除 `@ts-expect-error`
- TS-02: 所有 IPC handler 参数和返回值类型化
- TS-03: `preload/index.ts` 中 `window.openclaw` API 添加完整 TypeScript 接口声明

**Success Criteria:**
1. `gateway-bridge.ts` 中无 `@ts-expect-error` 或 `@ts-ignore`
2. `gateway-bridge.ts` 中无 `require()` 动态调用
3. 所有 IPC handler 函数签名声明具体类型（参数 + 返回值 `Promise<T>`）
4. `preload/index.ts` 中 `window.openclaw` 所有方法有完整 TypeScript 接口
5. `tsc --noEmit` 全程零错误

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use TypeScript best practices:
- Prefer discriminated unions over `Record<string, unknown>`
- Extract shared types to `src/types/gateway.ts`
- Use `Awaited<ReturnType<...>>` for IPC return types
- For dynamic imports, use type-only imports where possible

</decisions>

<code_context>
## Existing Code Insights

### Problem Spots (from codebase scout)

**gateway-bridge.ts — 4 `any` instances:**
- Line 162-164: `@ts-expect-error` + `this.client as any` — dynamic import blocks type resolution
- Line 330: `clientOpts: any` — passed to dynamically-loaded `GatewayClient` constructor
- Line 486: `request<any>()` return type

**ipc-handlers/gateway.ts:**
- `gw<T = unknown>()` factory — `T` never explicitly typed by callers
- All 80+ handlers use `params: Record<string, unknown>`
- Inline handlers (agent, config.patch) have same issue

**preload/index.ts:**
- ~60+ `[key: string]: unknown` index signatures on openclaw API
- `Record<string, unknown>` for all method params

**ipc-handlers/file.ts:**
- Line 228-229: `(fs.watch as (...)=>any)(...)` — forced cast to `any`

### Established Patterns

- All IPC handlers return `Promise<{ success: boolean; data?: T; error?: string }>`
- `ApiResponse<T>` alias in preload
- Gateway methods: sessions, chat, skills, config, cron, memory, channels, hooks, models, exec, device, node, wizard, push, voicewake, system, talk, browser, web, tts
- Bridge uses singleton pattern via `getGatewayBridge()`
- IPC broadcast: `win.webContents.send('openclaw:event', ...)` in bridge line 229

### Integration Points

- Renderer → preload → IPC → bridge → Gateway WebSocket
- Bridge broadcasts to all windows via `webContents.send`
- `expectFinal: true` flag used for agent.* methods

</code_context>

<specifics>
## Specific Ideas

### TS-01: gateway-bridge 静态 import 策略

Do NOT try to statically import `GatewayClient` — it's a Node.js module from `openclaw-source/`. Instead:
1. Keep the dynamic import
2. But TYPE the imported result: `const { GatewayClient } = await import(gatewayModule) as typeof import('gateway-module-types')`
3. Or extract the client interface separately and use it for typing `this.client`

### TS-02: IPC handler typing approach

For the 80+ `gw()` factory calls, type the method parameter:
- `gw<'sessions.list'>('openclaw:sessions:list', 'sessions.list')`
- Or better: `gw<T extends keyof GatewayMethods>('channel', method: T): void` — derive return from method name

For inline handlers with special opts, keep them inline but add explicit types.

### TS-03: preload typing approach

Instead of `[key: string]: unknown`, define specific interfaces per API group:
```typescript
interface SessionsAPI { list: (params: SessionListParams) => Promise<ApiResponse<Session[]>>; ... }
interface ChatAPI { send: (params: ChatSendParams) => Promise<ApiResponse<ChatResult>>; ... }
```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

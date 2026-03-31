# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Electron + OpenClaw Gateway (Desktop Shell Architecture)

**Key Characteristics:**
- Electron main process spawns OpenClaw as a child process (Node.js)
- Renderer process communicates with Gateway via IPC → Main Process → WebSocket
- OpenClaw Gateway handles all AI capabilities (inference, file sandbox, memory, skills)
- Zustand manages only UI state; business logic is delegated to Gateway

## Layers

**Main Process (`client/src/main/`):**
- Purpose: Electron lifecycle, IPC handlers, process management
- Location: `client/src/main/`
- Contains: `index.ts` (app entry), `openclaw.ts` (child process), `gateway-bridge.ts` (WebSocket bridge), `ipc-handlers/` (API handlers), `tray.ts`, `notifications.ts`, `updater.ts`
- Depends on: Electron APIs, OpenClaw child process
- Used by: Renderer via IPC

**Preload (`client/src/preload/`):**
- Purpose: Secure context bridge between main and renderer
- Location: `client/src/preload/index.ts`
- Contains: `contextBridge.exposeInMainWorld('electronAPI', ...)`, `contextBridge.exposeInMainWorld('openclaw', ...)`
- Pattern: All main process functionality accessed via `window.electronAPI` or `window.openclaw`

**Renderer (`client/src/renderer/`):**
- Purpose: React UI
- Location: `client/src/renderer/`
- Contains: Components, Zustand stores, hooks, lib utilities
- Depends on: React, Zustand, `window.openclaw` API

## Data Flow

**Typical user interaction (send message):**

1. User types in `ChatView.tsx` → calls `useChatStore.getState().sendMessage()`
2. `chatStore.sendMessage()` calls `window.openclaw.agent({ message, sessionKey, ... })`
3. IPC `openclaw:agent` → `main/ipc-handlers/gateway.ts`
4. `gateway-bridge.request('agent', params)` → WebSocket → OpenClaw Gateway
5. Gateway streams back events via WebSocket
6. Events broadcast through `gateway-bridge.broadcastEvent()` → IPC channel
7. Renderer receives via `window.openclaw.on()` → `chatStore.init()` event handler
8. `chatStore` updates messages array → React re-renders

**Startup sequence:**

1. `main/index.ts` app.whenReady() → creates BrowserWindow
2. Registers IPC handlers (gateway, file, shell, app, clawhub)
3. Starts OpenClaw child process via `openclawProcess.start()`
4. `gateway-bridge.connect()` → waits for HTTP readiness → fetches auth token → connects WebSocket
5. Renderer loads → calls `loadSettings()` → subscribes to Gateway events
6. `chatStore.init()` loads history and subscribes to events

## State Management Architecture

### Zustand Stores

**`appStore` (`client/src/renderer/stores/appStore.ts`)**
- Responsibilities: UI layout state, sidebar, panels, active tab
- Holds: `sidebarCollapsed`, `activeTab` ('avatar'|'chat'|'task'), `activeView`, `settingsModalOpen`, `bottomPanelOpen`, `rightPanelOpen`, `currentModel`, `currentPath`, `files`
- NOT persisted; ephemeral UI state

**`settingsStore` (`client/src/renderer/stores/settingsStore.ts`)**
- Responsibilities: All user preferences, theme, authorized dirs, workspace config
- Holds: `theme`, `fontSize`, `animationsEnabled`, `notificationsEnabled`, `compactMode`, `favorites`, `authorizedDirs`, `workspace`, `tts`, `stt`
- Pattern: Each setter writes to electron-store via IPC AND updates Zustand state
- Syncs: Subscribes to `settings:changed` IPC for cross-window sync

**`chatStore` (`client/src/renderer/stores/chatStore.ts`)**
- Responsibilities: Chat messages, streaming, session management
- Holds: `messages[]`, `sessionKey`, `sending`, `currentRunId`
- Events handled: `agent` (thinking/content/tool/done/error), `chat`, `exec.approval.requested`, `device.pair.*`, `node.pair.*`

**`taskStore` (`client/src/renderer/stores/taskStore.ts`)**
- Responsibilities: Task/CRON session management
- Holds: `tasks[]`, `selectedTaskId`, `taskLogs Map`, `loading`, `error`
- Maps: OpenClaw sessions with label='task' to local Task objects

**`avatarStore` (`client/src/renderer/stores/avatarStore.ts`)**
- Responsibilities: Avatar CRUD, active avatar
- Holds: `avatars[]`, `activeAvatarId`, `loading`, `error`, `demoMode`
- Demo mode: Falls back to `DEMO_AVATARS` when Gateway unavailable

**`openclawStore` (`client/src/renderer/stores/openclawStore.ts`)**
- Responsibilities: Gateway connection status, skills list
- Holds: `connected`, `running`, `connecting`, `skills[]`

**`execApprovalStore` (`client/src/renderer/stores/execApprovalStore.ts`)**
- Responsibilities: Exec approval queue, modal visibility
- Holds: `pending[]`, `current`, `isVisible`, `resolved Map`
- Pattern: Timeout-based auto-dismiss after 5 minutes

**`toastStore` (`client/src/renderer/stores/toastStore.ts`)**
- Re-export from `client/src/renderer/components/Toast.tsx`
- Holds: Toast notification queue

## OpenClaw Gateway Integration

**Process lifecycle (`openclaw.ts`):**
```typescript
// Development: app.getAppPath() + '/resources/openclaw-source'
// Production: process.resourcesPath + '/openclaw-source'
openclawPath = app.isPackaged
  ? path.join(process.resourcesPath, 'openclaw-source')
  : path.join(app.getAppPath(), 'resources', 'openclaw-source')

// Starts via tsx: node node_modules/tsx/dist/cli.mjs openclaw.mjs
// Environment: OPENCLAW_HOME = app.getPath('userData') + '/openclaw'
```

**WebSocket bridge (`gateway-bridge.ts`):**
- Connects to `ws://127.0.0.1:18789`
- Token auth: fetched from `~/.openclaw/config.json` or `openclaw-source/.openclaw/config.json`
- Security config: applied via `config.patch` RPC on connect (tools deny, sandbox mode, exec restrictions)
- `limitAccess` change: re-applied via `refreshSecurityConfig()` when electron-store changes

**IPC Handler pattern:**
- 6 handler files under `ipc-handlers/`:
  - `gateway.ts`: 100+ handlers for Gateway API passthrough (scoped, skills, memory, cron, etc.)
  - `file.ts`: File system ops with path validation
  - `shell.ts`: Window/dialog/shell/app utility handlers
  - `app.ts`: electron-store backed settings
  - `clawhub.ts`: ClawHub CLI integration
  - `path-validation.ts`: Shared path validation (no side effects)

## Key Architectural Decisions

| Decision | Rationale | Implementation |
|----------|-----------|----------------|
| Electron shell + OpenClaw child | All AI via Gateway; no custom backend | `openclawProcess.spawn()` |
| Zustand only for UI state | Business logic delegated to Gateway | Stores hold only ephemeral UI |
| electron-store single source of truth | Settings survive renderer restarts | `settingsStore.ts` writes to electron-store |
| Path validation on every file op | Security boundary enforcement | `ipc-handlers/path-validation.ts` |
| Event bridge via IPC | Gateway events → Renderer | `gateway-bridge.broadcastEvent()` → IPC |
| Landing page as BrowserView | Separate Next.js process | `client/src/main/index.ts:225-398` |

## Error Handling

**Strategy:** Guard checks + try/catch + fallback data

**Patterns:**
- IPC handlers: Always return `{ success: boolean; data?: T; error?: string }`
- Renderer: Component-level try/catch + Zustand error state
- Gateway offline: Stores use `DEMO_*` fallback data (avatarStore, openclawStore)
- Safety timeout: 5-minute timeout on chat messages to clear `sending` state

## Cross-Cutting Concerns

**Logging:** `electron-log` via `logger.scope()` in main process; `console.error` in renderer

**Validation:** `path-validation.ts` validates all file paths against `authorizedDirs` and `limitAccess`

**Authentication:** Token from `~/.openclaw/config.json`; Bootstrap token optional

---

*Architecture analysis: 2026-03-31*

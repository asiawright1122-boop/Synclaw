# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
synclaw/
├── client/
│   ├── src/
│   │   ├── main/                    # Electron main process
│   │   │   ├── index.ts             # App entry, window creation, lifecycle
│   │   │   ├── openclaw.ts          # OpenClaw child process manager
│   │   │   ├── gateway-bridge.ts     # WebSocket bridge to Gateway
│   │   │   ├── logger.ts             # electron-log wrapper
│   │   │   ├── app-settings.ts       # Settings type definitions
│   │   │   ├── ipc-handlers/         # IPC handler modules
│   │   │   │   ├── gateway.ts        # 100+ Gateway API passthrough handlers
│   │   │   │   ├── file.ts           # File system operations
│   │   │   │   ├── shell.ts          # Window/dialog/shell utilities
│   │   │   │   ├── app.ts            # electron-store settings
│   │   │   │   ├── clawhub.ts        # ClawHub CLI integration
│   │   │   │   ├── web.ts            # Web platform bridge (device token, usage reporting)
│   │   │   │   └── path-validation.ts # Shared path validation
│   │   │   ├── tray.ts               # System tray
│   │   │   ├── notifications.ts       # Electron notifications
│   │   │   └── updater.ts            # Auto-update
│   │   ├── preload/
│   │   │   └── index.ts              # contextBridge API (692 lines)
│   │   └── renderer/
│   │       ├── App.tsx               # Root component, layout
│   │       ├── main.tsx              # React entry
│   │       ├── components/           # React components
│   │       ├── stores/               # Zustand stores
│   │       ├── hooks/                # Custom React hooks
│   │       ├── lib/                  # Utilities
│   │       ├── styles/               # CSS
│   │       ├── types/                # TypeScript types
│   │       └── i18n/                 # Internationalization
│   ├── scripts/
│   │   └── download-openclaw.mjs     # OpenClaw source download script
│   ├── e2e/                           # Playwright E2E tests
│   └── electron-builder.yml           # Packaging config
├── openclaw-source/                   # OpenClaw submodule (not present in repo)
├── web/                              # Landing page (separate git repo)
└── .planning/                        # GSD planning artifacts
```

## Directory Purposes

**`client/src/main/`:**
- Purpose: Electron main process
- Contains: App entry, process management, IPC handlers, system integration
- Key files: `index.ts`, `openclaw.ts`, `gateway-bridge.ts`

**`client/src/preload/`:**
- Purpose: Secure bridge between main and renderer
- Contains: Single `index.ts` exposing `window.electronAPI` and `window.openclaw`

**`client/src/renderer/components/`:**
- Purpose: React UI components
- Contains: 30+ components including ChatView, Sidebar, Settings panels

**`client/src/renderer/stores/`:**
- Purpose: Zustand state management (UI state only)
- Contains: 7 stores for different domains

**`client/src/renderer/hooks/`:**
- Purpose: Custom React hooks
- Contains: `useSpeechRecognition.ts`, `useTTS.ts`, `useUsageReporter.ts`, `useContextMenu.ts`

**`client/src/renderer/lib/`:**
- Purpose: Utility functions
- Contains: API client, auth, credits, subscription, avatar templates

## Key File Locations

**Entry Points:**
- `client/src/main/index.ts`: Electron main process entry (594 lines)
- `client/src/renderer/main.tsx`: React entry point
- `client/src/preload/index.ts`: Preload script (692 lines)

**Configuration:**
- `client/electron-builder.yml`: Packaging configuration
- `client/package.json`: Dependencies and scripts
- `client/tsconfig.json`: TypeScript config

**Core Logic:**
- `client/src/main/gateway-bridge.ts`: Gateway WebSocket bridge (507 lines)
- `client/src/renderer/stores/chatStore.ts`: Chat state management (473 lines)
- `client/src/renderer/components/ChatView.tsx`: Chat UI (871 lines)

**Testing:**
- `client/e2e/app.spec.ts`: Playwright E2E tests

## TypeScript Files Over 500 Lines

| File | Lines | Purpose |
|------|-------|---------|
| `renderer/components/SkillsPanel.tsx` | 963 | Skills panel (settings sub-panel) |
| `renderer/components/SkillsMarketPanel.tsx` | 941 | Skills marketplace |
| `renderer/components/ChatView.tsx` | 871 | Chat interface |
| `renderer/components/FileExplorer.tsx` | 808 | File browser |
| `renderer/components/Header.tsx` | 714 | App header |
| `preload/index.ts` | 692 | IPC bridge API |
| `renderer/components/Sidebar.tsx` | 646 | Sidebar with avatar/task tabs |
| `renderer/components/OnboardingView.tsx` | 621 | First-run setup wizard |
| `main/index.ts` | 594 | Main process entry |
| `renderer/components/settings/McpPanel.tsx` | 563 | MCP configuration |
| `renderer/components/RightPanel.tsx` | 522 | Memory/notes panel |
| `renderer/types/electron.d.ts` | 520 | Global type declarations |
| `main/gateway-bridge.ts` | 507 | Gateway WebSocket bridge |

## Naming Conventions

**Files:**
- Components: PascalCase (`ChatView.tsx`, `Sidebar.tsx`)
- Stores: camelCase with Store suffix (`chatStore.ts`, `taskStore.ts`)
- Utilities: camelCase (`api.ts`, `auth.ts`)
- IPC handlers: camelCase (`gateway.ts`, `file.ts`)

**Directories:**
- Components: PascalCase (`components/SettingsView.tsx`)
- Stores: camelCase (`stores/chatStore.ts`)
- Handlers: camelCase (`ipc-handlers/gateway.ts`)

## Dead Code Detection

### `FALLBACK_AVATARS` in Sidebar.tsx (DUPLICATE DATA)

**Issue:** `Sidebar.tsx` defines its own `FALLBACK_AVATARS` constant:
```typescript
const FALLBACK_AVATARS: Avatar[] = [
  { id: 'ac', name: 'AutoClaw', ... },
  { id: 'think', name: '沉思小助手', ... },
  { id: 'watch', name: '监控', ... },
]
```

This is **duplicate data** — `avatarStore.ts` already has `DEMO_AVATARS` with similar content. The Sidebar imports `AvatarListPanel` but uses `FALLBACK_AVATARS` directly for its own state instead of `avatarStore`.

**Impact:** Avatar state is split between `avatarStore` and local Sidebar state, causing potential sync issues.

### Duplicate SkillsPanel Files

**Issue:** Two SkillsPanel files exist:
- `renderer/components/SkillsPanel.tsx` (963 lines) — standalone panel
- `renderer/components/settings/SkillsPanel.tsx` — settings sub-panel

**Analysis:** `SettingsView.tsx` imports both. The standalone `SkillsPanel.tsx` is used in `App.tsx` (indirectly via routing?), while the settings version is used within Settings modal.

**Files importing:**
- `renderer/components/SettingsView.tsx` imports `settings/SkillsPanel.tsx`

### Unused/Orphaned Lib Files

**`renderer/lib/auth.ts`:** Full auth service with localStorage persistence
- Contains: Login, register, logout, token refresh
- **Status:** NOT imported anywhere in codebase
- **Impact:** Dead code — user authentication is handled by Gateway, not this lib

**`renderer/lib/api.ts`:** HTTP API client for web SaaS platform
- **Status:** Connected to web bridge (used by `useUsageReporter` hook)
- **Impact:** Active — used to call web API from SynClaw renderer
- **Usage:** `window.openclaw.web.reportUsage()` → IPC → `web:report-usage` → HTTP POST

**`renderer/lib/apiKeys.ts`:** API key management
- **Status:** Used by `settings/SkillsPanel.tsx`
- **Impact:** In use

**`renderer/lib/credits.ts`:** Credits management
- **Status:** Check usage

### Dynamic Import Pattern

**`avatarStore.ts`** uses dynamic import:
```typescript
const { setSelectedAvatar } = await import('./appStore').then(m => m.useAppStore.getState())
```
This pattern indicates potential circular dependency or architectural smell.

## Circular Dependencies

**Known circular dependency:**
```
avatarStore.ts → appStore.ts (dynamic import)
```

`avatarStore.activateAvatar()` dynamically imports `appStore` to sync `selectedAvatar`. This should be refactored to use a shared approach or remove the coupling.

## Where to Add New Code

**New Feature Component:**
- UI: `client/src/renderer/components/NewFeature.tsx`
- State: `client/src/renderer/stores/newFeatureStore.ts` (if needed)
- Tests: `client/e2e/app.spec.ts`

**New IPC Handler:**
- Add method to appropriate file in `client/src/main/ipc-handlers/`:
  - Gateway API → `gateway.ts`
  - File operations → `file.ts`
  - Window/Dialog → `shell.ts`
  - Settings → `app.ts`
  - Web platform bridge → `web.ts`

**New Zustand Store:**
- Create `client/src/renderer/stores/newStore.ts`
- Import in components as needed

**New Hook:**
- Create `client/src/renderer/hooks/useNewHook.ts`

## Special Directories

**`client/resources/` or `resources/`:**
- Purpose: Bundled resources (OpenClaw source, assets)
- Generated: No (downloaded separately via `download-openclaw.mjs`)
- Committed: No (.gitignored)

**`client/e2e/`:**
- Purpose: Playwright end-to-end tests
- Contains: `app.spec.ts`

---

*Structure analysis: 2026-03-31*

# Coding Conventions

**Analysis Date:** 2026-03-31

## TypeScript Configuration

**Strictness Level:** `strict: true` enforced across all tsconfig files.

**Renderer (`client/tsconfig.json`):**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "react-jsx"
  }
}
```

**Main Process (`client/tsconfig.main.json`):**
```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

**Build:** `cd client && pnpm exec tsc --noEmit` passes with zero errors.

---

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` — `ChatView.tsx`, `SettingsView.tsx`, `ExecApprovalModal.tsx`
- TypeScript modules: `camelCase.ts` — `logger.ts`, `gateway-bridge.ts`, `app-settings.ts`
- Settings panels: `PascalCase.tsx` subdirectory — `settings/GeneralPanel.tsx`, `settings/ModelsPanel.tsx`

**Hooks:** `camelCase.ts` with `use` prefix — `useSpeechRecognition.ts`, `useTTS.ts`, `useContextMenu.ts`

**Zustand Stores:** `camelCase.ts` with `Store` suffix — `appStore.ts`, `chatStore.ts`, `taskStore.ts`, `execApprovalStore.ts`

**TypeScript Interfaces:** `PascalCase` defined inline in store files or `renderer/types/`:
```typescript
// renderer/stores/appStore.ts
export interface AvatarItem {
  id: string
  name: string
  status?: 'online' | 'offline' | 'busy'
}

// renderer/types/electron.d.ts
type OpenClawStatus = 'idle' | 'starting' | 'ready' | 'connected' | 'disconnected' | 'error'
```

**Path Aliases:** Only one defined in `client/tsconfig.json`:
```json
"paths": { "@/*": ["src/renderer/*"] }
```

---

## Import Conventions

**No barrel files.** Direct imports are used throughout:
```typescript
import { useAppStore } from '../stores/appStore'
import { useChatStore } from '../stores/chatStore'
import { ChatView } from './ChatView'
```

**Import order** (inferred from source files):
1. Node.js built-ins (`node:path`, `node:fs`, `node:os`)
2. Third-party packages (`electron`, `zustand`, `framer-motion`, `lucide-react`, `react-markdown`)
3. Local modules (`../stores`, `./components`, `./hooks`, `./lib`)
4. Type imports via `import type`

**Extensions:** ES module `.js` extensions in imports for main process files:
```typescript
import { openclawProcess } from './openclaw.js'
import { registerIpcHandlers } from './ipc-handlers.js'
```

---

## Error Handling Patterns

**IPC Handlers (`client/src/main/ipc-handlers/`):**
- Use `try/catch` with return `{ success: boolean; data?: T; error?: string }`
- Every handler wraps Gateway errors gracefully
- Example pattern from `gateway.ts`:
```typescript
ipcMain.handle('openclaw:connect', async () => {
  try { await g().connect(); return { success: true } }
  catch (err) { log.error('connect failed:', err); return { success: false, error: String(err) } }
})
```

**Renderer Components:**
- Guard checks for `window.openclaw` availability:
```typescript
// renderer/stores/chatStore.ts
if (!window.openclaw) {
  console.warn('[ChatStore] Cannot send message: window.openclaw unavailable')
  return
}
```
- Error boundaries via try/catch in async actions
- Fallback data patterns (not crash on missing Gateway)
- Safety timeouts for long-running operations (5-minute timeout in `chatStore.sendMessage`)

**Main Process:**
- Global uncaught exception/rejection handlers in `main/index.ts`:
```typescript
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error)
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`)
})
```

---

## Logging Patterns

**Primary Framework:** `electron-log` (configured in `client/src/main/logger.ts`)

**Log Levels:** `debug`, `info`, `warn`, `error`

**Scoped Logger Pattern:**
```typescript
// client/src/main/logger.ts
const log = logger.scope('main')

// client/src/main/ipc-handlers/gateway.ts
const log = logger.scope('gateway')
log.error(`${channel} failed:`, err)
```

**Log Configuration:**
```typescript
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
// File: ~/Library/Logs/SynClaw/main.log (macOS)
```

**Renderer Logging:** Uses `console.*` directly (not electron-log). Pattern:
```typescript
console.error('[ChatStore] Failed to load history from Gateway:', error)
console.warn('[ChatStore] Cannot send message: window.openclaw unavailable')
console.log('[ChatStore] Exec approval resolved:', payload)
```

**Inconsistent Logging Found:**
- Main process uses `logger.scope()` + electron-log
- Renderer uses `console.*` directly
- `main/index.ts` has mixed logging: `logger.scope('main')` but also `console.warn()` for encryption key warning

---

## Internationalization

**Framework:** Custom lightweight i18n in `renderer/i18n/index.ts`

**Supported Locales:** `'zh' | 'en'`

**Structure:**
```typescript
const translations: Record<Locale, Record<string, string>> = { zh, en }
export function t(key: string, params?: Record<string, string | number>): string
```

**Key Pattern:** Dot-notation keys (e.g., `'chat.placeholder'`, `'sidebar.tab.avatar'`, `'status.connected'`)

**Fallback:** Falls back to `'zh'` if key missing from current locale

**Current Status:**
- ~115 keys defined for Chinese, ~90 for English
- Not all UI text is i18n'd — many inline Chinese strings in JSX remain hardcoded (e.g., `'命令执行审批'`, `'批准执行'`, `'拒绝'`, `'高风险'`, `'环境变量'`)
- Recommendation: Audit all non-i18n strings in `ExecApprovalModal.tsx`, `SettingsView.tsx`, and panel components

---

## Magic Numbers and Constants

**Found hardcoded values:**
- `5 * 60 * 1000` (5 minutes) — safety timeout in `chatStore.sendMessage` → should be named `SAFETY_TIMEOUT_MS`
- `MAX_ATTACHMENTS = 5` — `ChatView.tsx` line 448
- `MAX_FILE_SIZE = 10 * 1024 * 1024` (10 MB) — `ChatView.tsx` line 449
- `LANDING_PORT = 3847` — `main/index.ts` line 233
- `LANDING_HOST = '127.0.0.1'` — `main/index.ts` line 234
- `DEFAULT_TIMEOUT_MS = 60_000` — `gateway-bridge.ts`
- `DEFAULT_WS_PORT = 18789` — OpenClaw Gateway default port
- Window dimensions: `width: 1200, height: 800` — `main/index.ts` line 175

**Constants file:** Not present. All magic numbers are inline.

---

## Code Smells and Anti-Patterns

**1. Mixed logging APIs (Low severity):**
- `main/index.ts` uses both `logger.scope('main')` and `console.warn()` on line 42
- Renderer consistently uses `console.*` — main process should be consistent with electron-log

**2. Type-only issues (Informational):**
- `main/index.ts` lines 17-24: Dynamic `require('electron-store')` with `// eslint-disable-next-line @typescript-eslint/no-require-imports` comments
- Wide use of `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for dynamic store access

**3. Incomplete i18n (Medium severity):**
- `ExecApprovalModal.tsx` has ~20 hardcoded Chinese strings: `'命令执行审批'`, `'待执行命令'`, `'执行意图'`, `'批准执行'`, `'拒绝'`, `'高风险'`, `'需注意'`, `'安全'`, `'低风险命令'`, etc.
- Panel components (`settings/*.tsx`) likely have similar issues

**4. No ESLint configuration:**
- No `.eslintrc*` or `eslint.config.*` in project root (`client/`)
- Prevents automated style enforcement
- Comment-based eslint-disable directives present but not systematically enforced

**5. Error swallowing:**
```typescript
// renderer/components/ChatView.tsx line 336
} catch {
  // Ignore
}
```
- Empty catch blocks make debugging difficult

**6. Preload massive flat object:**
- `preload/index.ts` is 693 lines with a single flat `electronAPI` and `openclaw` object
- Would benefit from splitting into namespaces or helper modules

---

## Component Patterns

**React Components:**
- Functional components with explicit `export function`
- Props defined as interfaces in same file (small components) or in separate `types/` files
- `memo()` used for expensive components (`MessageBubble` in `ChatView.tsx`)
- Custom comparison function in `memo()` for performance:
```typescript
const MessageBubble = memo(({ message, onContextMenu }: MessageBubbleProps) => { ... },
  (prev, next) => prev.message.id === next.message.id && prev.message.content === next.message.content
)
```

**Zustand Stores:**
- All use `create<Interface>` pattern with explicit state interface
- Async actions use try/catch with error state
- Optimistic updates with rollback on failure (visible in `taskStore.ts`)

**Framer Motion:**
- `motion.div`, `AnimatePresence` used for enter/exit animations
- Consistent transition durations: `duration: 0.2` for most, `duration: 0.15` for modals

---

*Convention analysis: 2026-03-31*

# Phase 13 — SECURITY

**Goal:** Enable electron-store encryption with migration path and make WEB_API_BASE graceful.

**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04

---

## Analysis

### Existing Code

| Area | Current State | Gap |
|------|--------------|-----|
| `index.ts` store init | `encryptionKey: process.env.STORE_ENCRYPTION_KEY ?? undefined`; warning logged if unset in non-dev | No UI for users to enable/configure |
| `app-settings.ts` | No version field; `web.deviceToken/id/name` stored as plain strings | No migration mechanism |
| `web.ts` | `if (!WEB_API_BASE) throw new Error(...)` at module load time | Hard crash if env var absent; no graceful degradation |
| Settings `security` nav | Currently maps to `AuthorizedDirsPanel` | Mislabeled; no encryption UI |

### Key Technical Insight: Encryption Key Lifecycle

electron-store's `encryptionKey` is consumed **synchronously at store initialization** (module load time). It cannot be changed at runtime. The practical UX flow is:

1. User sees "未加密" warning in SecurityPanel
2. Clicks "启用加密" → key is generated → saved to `.env` → shown to user with restart instruction
3. On next app start, `index.ts` reads `STORE_ENCRYPTION_KEY` from env → store initializes encrypted
4. electron-store handles the encryption transparently on next save (no manual migration needed)

For `WEB_API_BASE`, the module-level throw blocks the entire `web.ts` module from loading. The fix: lazy check, graceful skip, and move URL to `AppSettings`.

---

## Tasks

### 1. `security:status` IPC handler — SEC-01
- **File:** `client/src/main/ipc-handlers/security.ts` (new)
- Returns `{ encryptionEnabled, webApiBaseConfigured, webApiBase }`
- `encryptionEnabled = !!process.env.STORE_ENCRYPTION_KEY`
- `webApiBaseConfigured = !!process.env.WEB_API_BASE`
- Add to `client/src/main/ipc-handlers.ts` import/register

### 2. `security:generateKey` IPC handler — SEC-01
- **File:** `client/src/main/ipc-handlers/security.ts`
- Generates a 32-char random hex key (`crypto.randomBytes(16).toString('hex')`)
- Reads `.env` from `app.getPath('userData')` directory
- Appends/writes `STORE_ENCRYPTION_KEY=<key>` to `.env`
- Returns `{ key, instructions }` (key shown to user in modal)
- Also saves to `appSettings` field: `settings.security.encryptionKeySetAt` timestamp

### 3. `security:setWebApiBase` IPC handler — SEC-04
- **File:** `client/src/main/ipc-handlers/security.ts`
- Saves `webApiBase` to `AppSettings` (`security.webApiBase` field)
- Reads from `AppSettings.webApiBase` in `web.ts` lazy getter

### 4. `app-settings.ts` new fields — SEC-01/04
- **File:** `client/src/main/app-settings.ts`
- Add to `AppSettings`:
  ```typescript
  security: {
    encryptionEnabled: boolean  // true once STORE_ENCRYPTION_KEY is set
    encryptionKeySetAt: string | null  // ISO date when user enabled encryption
    webApiBase: string  // user-configured WEB_API_BASE (persisted in store)
  }
  ```
- Add to `DEFAULT_SETTINGS`:
  ```typescript
  security: {
    encryptionEnabled: !!process.env.STORE_ENCRYPTION_KEY,
    encryptionKeySetAt: null,
    webApiBase: '',
  }
  ```

### 5. `web.ts` lazy init — SEC-03
- **File:** `client/src/main/ipc-handlers/web.ts`
- Remove the module-level `if (!WEB_API_BASE) throw new Error(...)`
- Add lazy getter:
  ```typescript
  function getWebApiBase(): string | undefined {
    return process.env.WEB_API_BASE || getAppSettings().security.webApiBase || undefined
  }
  ```
- In each handler: `const base = getWebApiBase(); if (!base) return { success: true, skipped: true }`
- Update `apiRequest()` to use `getWebApiBase()` dynamically

### 6. Preload bridge — SEC-01/04
- **File:** `client/src/preload/index.ts`
- Add:
  ```typescript
  security: {
    getStatus: () => ipcRenderer.invoke('security:status'),
    generateKey: () => ipcRenderer.invoke('security:generateKey'),
    setWebApiBase: (url: string) => ipcRenderer.invoke('security:setWebApiBase', url),
  }
  ```

### 7. SecurityPanel component — SEC-01/02
- **File:** `client/src/renderer/components/settings/SecurityPanel.tsx` (new)
- Shows **two sections**:

  **A. 数据加密 (electron-store)**
  - If `encryptionEnabled === true`: green lock badge + "已启用加密存储"
  - If `encryptionEnabled === false`: amber warning card:
    - Icon: ShieldAlert / Lock
    - Title: "数据未加密"
    - Body: "API Key、授权目录等敏感数据以明文存储。设置 `STORE_ENCRYPTION_KEY` 环境变量并重启应用可启用加密。"
    - CTA button: "启用加密存储" → triggers `security:generateKey` → shows modal with:
      - Generated key value (copyable)
      - Instructions: "请将以下内容添加到您的 `.env` 文件：\nSTORE_ENCRYPTION_KEY=<key>\n然后重启应用。"

  **B. Web API 配置**
  - Input field showing current `webApiBase` (from `security:status`)
  - If `WEB_API_BASE` env var is set: disabled input showing env var value + "（环境变量）"
  - If not: editable input → "保存" button → `security:setWebApiBase`
  - Below input: "用于 SynClaw 云端同步功能，若未配置则跳过。"

- **Import:** `Shield, Lock, AlertTriangle, Copy, Check, ExternalLink`

### 8. SettingsView nav update — SEC-01
- **File:** `client/src/renderer/components/SettingsView.tsx`
- Change nav item label: `security` → `{ id: 'security', label: '安全性', icon: Shield }` (was '文件安全')
- Change switch: `case 'security': return <SecurityPanel />` (was `<AuthorizedDirsPanel />`)
- Import `SecurityPanel` from `./settings/SecurityPanel`

---

## Verification

After all tasks:

1. `pnpm test` (Vitest) still passes
2. `cd client && node_modules/.bin/tsc --noEmit` → 0 errors
3. App starts without error when `WEB_API_BASE` is not set
4. Security panel shows correct encryption status (reflects env var)
5. "启用加密" button generates a key and shows copyable modal
6. Web API base input can be saved and persists

---

## Risks & Notes

- **Electron store re-initialization**: electron-store is initialized at module level — cannot be re-initialized at runtime. The UX flow (generate key → show instructions → user restarts) is the correct approach for v1.3. Keychain/auto-restart is explicitly out-of-scope (v1.4+).
- **`.env` path**: `app.getPath('userData')` returns the user data directory. On macOS this is `~/Library/Application Support/SynClaw/`. The `.env` file should be in the app root, not user data. Better approach: save to `app.getPath('exe')` parent dir or use a dedicated `keys.json` file in userData. Use `path.join(app.getPath('userData'), '..', '..', '..', '..', '.env')` (project root on dev, app bundle on prod). Alternative: just show the key and instruction, don't try to write `.env` — the user sets it manually.
- **Simplification**: Given the complexity of writing to `.env`, the `generateKey` handler should just generate and return the key with instructions. Writing to `.env` from a packaged Electron app is non-trivial (different paths in dev vs prod). Show instructions instead.
- **Migration**: electron-store automatically handles encryption migration — when you open an existing plaintext store with an `encryptionKey`, electron-store will read the plaintext data and re-save it encrypted on the next write. No explicit migration code needed.

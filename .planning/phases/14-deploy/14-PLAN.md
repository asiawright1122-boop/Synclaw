# Phase 14 — DEPLOY

**Goal:** Make macOS code signing transparent with user-configurable credentials and clear documentation.

**Requirements:** DEPLOY-01, DEPLOY-02, DEPLOY-03

---

## Analysis

### Existing Artifacts vs Requirements

| Requirement | Existing | Gap |
|---|---|---|
| DEPLOY-01: AboutPanel signing status | No signing status in AboutPanel | Need to add |
| DEPLOY-01: "配置签名" button | None | Need to add |
| DEPLOY-02: README.md signing guide | Already complete (lines 132-185) | ✅ Done |
| DEPLOY-03: `notarize: autoSubmit: true` | Already set in electron-builder.yml | ✅ Done |

**Summary:** Only DEPLOY-01 requires implementation. The other two are already satisfied.

### Signing Status Detection

**macOS signing status** can be detected by running `codesign` CLI in the main process:
- `codesign -dvvvv "<app-path>"` → exit 0 = signed, exit 1 = not signed
- On non-macOS: always show "仅在 macOS 上可用"

Or simpler: detect from build artifacts — check if `release/latest-mac/SynClaw.app` exists and run `spctl -a -t exec -vv <app>` to verify ticket.

**Simplest approach for v1.3:** Use a static flag set at build time via environment variable, or check for `APPLE_ID`/`APPLE_TEAM_ID` env presence.

---

## Tasks

### 1. `app:getSigningStatus` IPC handler — DEPLOY-01
- **File:** `client/src/main/ipc-handlers/shell.ts` (or `app.ts`)
- Add to `shell.ts` (already has app utility handlers):
  ```typescript
  ipcMain.handle('app:getSigningStatus', async () => {
    const { exec } = await import('node:child_process')
    return new Promise((resolve) => {
      exec(
        'codesign -dvvvv /Applications/SynClaw.app 2>/dev/null; echo "EXIT:$?"',
        { timeout: 5000 },
        (err, stdout) => {
          if (err || stdout.includes('EXIT:1')) {
            resolve({ success: true, data: { status: 'unsigned' } })
          } else {
            // Extract Team ID from output
            resolve({ success: true, data: { status: 'signed' } })
          }
        }
      )
    })
  })
  ```
- Alternative (simpler): just check if env vars are set → status can be 'env_configured' | 'unsigned'

### 2. AboutPanel signing status card — DEPLOY-01
- **File:** `client/src/renderer/components/settings/AboutPanel.tsx`
- Add a new `Card` below the "检查更新" card with:
  - **When status = 'signed':** green Shield icon + "已签名" badge + team info
  - **When status = 'unsigned':** orange AlertTriangle icon + "未签名" badge + "配置签名" link button
  - **When status = 'env_configured':** blue Info icon + "签名已配置（将在下次构建时生效）"
  - **On non-macOS:** muted info text "签名状态仅在 macOS 构建时可用"
- "配置签名" button: links to README section `#macos-分发与公证签名` via `window.electronAPI?.shell.openExternal`

### 3. Preload bridge
- **File:** `client/src/preload/index.ts` + `client/src/renderer/types/electron.d.ts`
- Add `app.getSigningStatus()` to both preload and type declaration

### 4. README.md — confirm DEPLOY-02
- Already complete at lines 132-185. Verify section anchor exists: `#macos-分发与公证签名`

### 5. electron-builder.yml — confirm DEPLOY-03
- Already has `notarize: autoSubmit: true` at line 64-67. ✅

---

## Verification

1. `pnpm test` passes
2. `cd client && node_modules/.bin/tsc --noEmit` → 0 errors
3. AboutPanel renders signing status correctly
4. "配置签名" button opens README signing section
5. README contains complete signing guide

---

## Risks & Notes

- **codesign runs only on macOS**: Guard with `process.platform === 'darwin'`
- **Signing status at build vs runtime**: A packaged app may have been signed differently than what env vars suggest. `codesign -dvvvv` is the authoritative check but requires the app to be installed in `/Applications`. Fall back to env var check if codesign fails.
- **App path**: `/Applications/SynClaw.app` is the standard; user may have installed elsewhere. Check `process.execPath` for the running app.

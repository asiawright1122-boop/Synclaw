# Phase 3: 文件安全与权限 — 执行计划

**Phase:** 3
**Created:** 2026-03-24
**Status:** Ready for execution
**Requirements addressed:** FILE-01, FILE-02, FILE-03

---

## Context

### Bug Found During Exploration

**`authorizedDirs` 保存静默失败。** `ipc-handlers.ts:1144` 的 `settings:set` handler whitelist 不包含 `authorizedDirs`。任何调用 `addAuthorizedDir`/`removeAuthorizedDir` 都返回 `{ success: false }` 并被静默丢弃，导致 Onboarding 收集的授权目录在应用重启后丢失（重置为 `[]`）。这是 Plan 01 首要修复的问题。

### Current State

- `authorizedDirs` 已存储在 `AppSettings` 接口（`index.ts:24-50`）
- Zustand `settingsStore` 有 `authorizedDirs` 状态字段和 `addAuthorizedDir`/`removeAuthorizedDir` 方法
- `OnboardingView` Step 2 在引导时收集目录
- 所有 `file:*` IPC handler 直接使用 Node.js `fs` 模块，无任何授权检查
- OpenClaw Gateway 有 `BLOCKED_HOST_PATHS`（`openclaw-source/src/agents/sandbox/validate-sandbox-security.ts:18-33`）和 `isPathInside()`（`fs-safe.ts`），但这些在 Gateway 层，SycClaw IPC 层完全不检查

---

## Plans

### Plan 01: 修复 `authorizedDirs` 持久化 + 创建路径验证层

**Objective:** 修复 whitelist BUG，让 `authorizedDirs` 能正确持久化到 electron-store，并在主进程 IPC 层建立路径验证基础设施。

**Requirements addressed:** FILE-01, FILE-03

**Tasks:**

1. **修复 `settings:set` whitelist BUG**
   - **read_first:** `client/src/main/ipc-handlers.ts` 行 1142-1155, `client/src/main/index.ts` 行 24-50
   - **action:** 在 `ipc-handlers.ts` 的 `validKeys` 数组（行 1144）中添加 `'authorizedDirs'`
   - **acceptance_criteria:**
     - `ipc-handlers.ts` 行 1144 的 validKeys 包含 `'authorizedDirs'`
     - `tsc --noEmit` 零错误

2. **创建路径验证函数**
   - **read_first:** `client/src/main/ipc-handlers.ts` 行 895-1056, `client/resources/openclaw-source/src/agents/sandbox/validate-sandbox-security.ts` 行 18-33, `client/resources/openclaw-source/src/infra/fs-safe.ts`
   - **action:** 在 `ipc-handlers.ts` 顶部（行 1-10 附近）添加路径验证模块：
     ```typescript
     // 敏感目录黑名单（绝对路径）
     const BLOCKED_PATHS = new Set([
       '/etc', '/private/etc', '/proc', '/sys', '/dev',
       '/root', '/boot', '/run', '/var/run', '/private/var/run',
       '/usr/bin', '/usr/lib', '/usr/sbin',
       'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)',
       'C:\\ProgramData',
     ])
     
     function isPathBlocked(filePath: string): boolean {
       const normalized = path.normalize(filePath)
       for (const blocked of BLOCKED_PATHS) {
         if (normalized.startsWith(blocked + path.sep) || normalized === blocked) return true
       }
       return false
     }
     
     function isPathAuthorized(filePath: string, authorizedDirs: string[]): boolean {
       if (authorizedDirs.length === 0) return false
       const normalized = path.normalize(filePath)
       return authorizedDirs.some(dir => {
         const authNorm = path.normalize(dir)
         return normalized.startsWith(authNorm + path.sep) || normalized === authNorm
       })
     }
     
     function validatePath(filePath: string, authorizedDirs: string[]): { valid: boolean; error?: string } {
       if (isPathBlocked(filePath)) return { valid: false, error: `访问被拒绝：系统敏感目录 ${filePath}` }
       if (!isPathAuthorized(filePath, authorizedDirs)) return { valid: false, error: `访问被拒绝：路径 ${filePath} 未在授权目录范围内` }
       return { valid: true }
     }
     ```
   - **acceptance_criteria:**
     - `client/src/main/ipc-handlers.ts` 包含 `BLOCKED_PATHS` 常量（至少 10 项）
     - 包含 `isPathBlocked()`, `isPathAuthorized()`, `validatePath()` 三个函数
     - `validatePath()` 返回 `{ valid: boolean; error?: string }` 格式
     - `tsc --noEmit` 零错误

3. **在所有 file:* handler 中集成路径验证**
   - **read_first:** `client/src/main/ipc-handlers.ts` 行 895-1056, `client/src/main/index.ts` 行 24-50
   - **action:** 在每个 file handler 开头调用 `validatePath()`，未授权时立即返回 `{ success: false, error: ... }` 而不调用 `fs`。需要修改的 handlers：`file:read`（行 895）、`file:readBinary`（905）、`file:write`（915）、`file:list`（925）、`file:delete`（940）、`file:stat`（955）、`file:mkdir`（974）、`file:exists`（984）、`file:rename`（988）、`file:copy`（998）、`file:watch`（1025）、`file:unwatch`（1044）
   - 每个 handler 在开头添加：
     ```typescript
     const authDirs = getAppSettings().authorizedDirs
     const validation = validatePath(filePath, authDirs)
     if (!validation.valid) return { success: false, error: validation.error }
     ```
   - `file:rename` 有两个路径（oldPath, newPath），两个都需要验证
   - `file:copy` 有两个路径（srcPath, destPath），两个都需要验证
   - `file:watch`/`file:unwatch` 验证 dirPath
   - **acceptance_criteria:**
     - 每个 file handler 在 fs 调用前有 validatePath 检查
     - `tsc --noEmit` 零错误
     - `build:main` 成功（`cd client && node scripts/build-main.mjs`）

---

### Plan 02: Settings 授权目录 UI 面板

**Objective:** 在 SettingsView 中添加授权目录管理面板，支持添加/移除授权路径，以及一个权限拒绝通知组件。

**Requirements addressed:** FILE-02, FILE-03

**Tasks:**

1. **在 SettingsView 添加授权目录面板**
   - **read_first:** `client/src/renderer/components/SettingsView.tsx` 行 1-100（结构），`client/src/renderer/components/OnboardingView.tsx` 行 95-108（目录选择示例）
   - **action:** 在 SettingsView 的 `settingsSections` 数组中添加新 section：
     ```typescript
     {
       id: 'security',
       label: '文件安全',
       icon: Shield,
       component: AuthorizedDirsPanel,
     }
     ```
   - **acceptance_criteria:**
     - `SettingsView.tsx` 包含 `security` section 或 `AuthorizedDirsPanel` 引用
     - `tsc --noEmit` 零错误

2. **创建 AuthorizedDirsPanel 组件**
   - **read_first:** `client/src/renderer/components/OnboardingView.tsx`（目录选择 UI 风格）, `client/src/renderer/stores/settingsStore.ts`（Zustand actions）
   - **action:** 创建 `client/src/renderer/components/AuthorizedDirsPanel.tsx`：
     - 标题：`<h2>授权目录</h2>` + 说明文字（"仅授权目录内的文件可被 AI 操作"）
     - 添加按钮：调用 `openclaw.dialog.selectDirectory()`，选择后调用 `addAuthorizedDir(path)`
     - 目录列表：`authorizedDirs.map(dir => <li>{dir} <button onClick={() => removeAuthorizedDir(dir)}>移除</button></li>)`
     - 空状态：显示"未设置授权目录，请添加至少一个目录"
     - 样式：与 SettingsView 其他 panel 风格一致（Card 组件、SectionHeader 样式）
   - **acceptance_criteria:**
     - `AuthorizedDirsPanel.tsx` 文件存在且包含目录列表渲染
     - 包含添加（selectDirectory）和移除功能
     - 包含空状态 UI
     - `tsc --noEmit` 零错误

3. **创建 PermissionDeniedToast 通知组件**
   - **read_first:** `client/src/renderer/stores/settingsStore.ts` 行 1-30（Zustand 结构），现有通知组件（如有）
   - **action:** 创建 `client/src/renderer/components/PermissionDeniedToast.tsx`（或集成到现有通知系统）：
     - 红色警告样式（Error variant）
     - 显示"权限不足：此操作需要授权目录权限"
     - 自动消失（5秒）或手动关闭
   - **acceptance_criteria:**
     - 组件文件存在
     - `tsc --noEmit` 零错误

4. **在 App.tsx 集成权限拒绝通知**
   - **read_first:** `client/src/renderer/App.tsx`
   - **action:** 在 App.tsx 中监听 file 操作权限拒绝错误，可通过 Zustand notification store 触发 toast
   - **acceptance_criteria:**
     - `App.tsx` 包含权限通知相关逻辑
     - `tsc --noEmit` 零错误

---

## Verification

### Build Verification

```bash
cd /Users/kaka/Desktop/synclaw/client
pnpm exec tsc --noEmit
node scripts/build-main.mjs
pnpm build:renderer
```

### Functional Verification

1. **authorizedDirs 持久化验证：** 修改 `authorizedDirs` 后重启应用，目录列表保持不变
2. **路径白名单验证：** 尝试访问 `file:read` `/etc/passwd`（macOS）返回权限拒绝错误
3. **敏感目录验证：** 尝试访问 `file:read` `/proc/cpuinfo`（macOS 返回 ENOENT，但路径检查在 fs 调用前进行）
4. **授权目录 UI：** Settings → 安全面板显示目录列表，支持添加/移除

---

## must_haves (Goal-Backward Verification)

| Criterion | Source |
|-----------|--------|
| `../` 路径穿越被阻止 | validatePath() 在 normalize 后检查，不依赖 OS |
| 敏感目录访问被拒绝 | BLOCKED_PATHS Set 包含 `/etc`, `/proc`, `C:\Windows` 等 |
| Settings 中可动态添加/移除授权路径 | AuthorizedDirsPanel 使用 addAuthorizedDir/removeAuthorizedDir |
| 权限拒绝返回明确错误 | `{ success: false, error: "访问被拒绝：..." }` |
| 授权目录持久化，重启后保持 | validKeys 包含 authorizedDirs → electron-store 正确写入 |
| TypeScript 零错误 | tsc --noEmit 全量检查 |

---

## Dependencies

- Plan 02 依赖 Plan 01（路径验证函数必须先存在才能集成）
- 两个 plan 共享 `settingsStore` Zustand store

## Wave 1 (Parallel)

- Plan 01 任务 1（修复 whitelist BUG）
- Plan 01 任务 2（创建路径验证函数）
- Plan 02 任务 2（创建 AuthorizedDirsPanel）
- Plan 02 任务 3（创建 PermissionDeniedToast）

## Wave 2 (Sequential after Wave 1)

- Plan 01 任务 3（集成路径验证到所有 file handler）
- Plan 02 任务 1（在 SettingsView 添加 panel）
- Plan 02 任务 4（App.tsx 集成通知）
- 验证构建

---

*Plans: 2 | Waves: 2 | Created: 2026-03-24*

# Phase 3: 文件安全与权限 — 执行摘要

**Completed:** 2026-03-24
**Plans:** 2/2 完成

---

## Plans Executed

### Plan 01: 修复 `authorizedDirs` 持久化 + 路径验证层 ✓

**Objective:** 修复 whitelist BUG，建立路径验证基础设施。

**Actions:**

1. **修复 `settings:set` whitelist BUG** (`ipc-handlers.ts:1144`)
   - 在 `validKeys` 数组中添加 `'authorizedDirs'`
   - Onboarding 收集的授权目录现在能正确持久化到 electron-store

2. **创建路径验证模块** (`ipc-handlers.ts` 行 14-58)
   - `BLOCKED_PATHS` — 敏感系统目录黑名单（17 项）
   - `isPathBlocked()` — 检查路径是否在黑名单中
   - `isPathAuthorized()` — 检查路径是否在授权目录范围内
   - `validatePath()` — 组合验证，返回 `{ valid, error? }`

3. **集成验证到所有 file handler**
   - `file:read`, `file:readBinary`, `file:write`, `file:list`, `file:delete`, `file:stat`, `file:mkdir`, `file:exists`, `file:rename`（双路径验证）, `file:copy`（双路径验证）, `file:watch`, `file:unwatch`
   - 每个 handler 在 fs 调用前调用 `validatePath()`
   - 未授权时立即返回 `{ success: false, error: ... }`

**Files modified:**
- `client/src/main/ipc-handlers.ts`

**Verification:** `tsc --noEmit` 零错误 + `build:main` 成功

---

### Plan 02: Settings 授权目录 UI 面板 ✓

**Objective:** 在设置中添加授权目录管理界面。

**Actions:**

1. **创建 AuthorizedDirsPanel 组件**
   - 文件路径：`client/src/renderer/components/AuthorizedDirsPanel.tsx`
   - 空状态 UI（未配置时显示带 ShieldAlert 图标的提示）
   - 目录列表 UI（FolderOpen 图标 + 路径 + 删除按钮）
   - 添加按钮（FolderPlus 图标 + `electronAPI.dialog.selectDirectory()`）
   - 安全说明卡片（路径穿越、敏感目录防护）

2. **集成到 SettingsView**
   - 添加 `'security'` 到 `SettingsSection` union 类型
   - 添加 `'security'` nav item（Lock 图标，位置在 IM 频道和工作区之间）
   - 添加 `AuthorizedDirsPanel` case 到 panel switch
   - 添加 `Lock` 和 `AuthorizedDirsPanel` imports

3. **创建 PermissionDeniedToast hook**
   - 文件路径：`client/src/renderer/components/PermissionDeniedToast.tsx`
   - 提供 `usePermissionDeniedToast()` hook，调用 `toast.error()` 显示权限拒绝提示

**Files created:**
- `client/src/renderer/components/AuthorizedDirsPanel.tsx`
- `client/src/renderer/components/PermissionDeniedToast.tsx`

**Files modified:**
- `client/src/renderer/components/SettingsView.tsx`

**Verification:** `tsc --noEmit` 零错误 + `build:renderer` 成功

---

## Verification Results

| 检查项 | 结果 |
|--------|------|
| TypeScript (`tsc --noEmit`) | ✓ 零错误 |
| 主进程构建 (`build:main`) | ✓ |
| Renderer 构建 (`build:renderer`) | ✓ |
| authorizedDirs 持久化 BUG 修复 | ✓ validKeys 包含 authorizedDirs |
| 路径验证函数 | ✓ BLOCKED_PATHS + validatePath() |
| 12 个 file handler 集成 | ✓ 全部包含 validatePath() |
| AuthorizedDirsPanel | ✓ 文件存在，UI 完整 |
| SettingsView 集成 | ✓ security nav + panel |
| PermissionDeniedToast | ✓ hook 已创建 |

---

## Notes

- **发现 BUG（Phase 3 修复）:** `settings:set` whitelist 不包含 `authorizedDirs`，导致 Onboarding 收集的目录在重启后丢失
- **路径验证策略:** 零信任 — 默认拒绝，只有在 `authorizedDirs` 非空且路径在列表内才允许
- **敏感目录:** macOS（/etc, /proc, /sys, /dev）+ Windows（C:\Windows, C:\Program Files, C:\ProgramData）
- **路径穿越防护:** 使用 `path.normalize()` 解析 `../` 后再检查授权
- **FILE-01/02/03 全部完成:** 路径白名单验证 + 敏感目录保护 + 授权目录动态管理

# Phase 3: 文件安全与权限 — Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** GSD workflow phase planning

---

## Phase Boundary

在 SynClaw 主进程 IPC 层建立文件访问安全边界，所有文件操作必须经过授权验证才能执行。

## Implementation Decisions

### FILE-01: 路径白名单验证

- **Locked decision:** 路径验证在主进程 IPC 层执行（`ipc-handlers.ts`），不在渲染进程或 Gateway 层
- **Locked decision:** 使用 `path.normalize()` 解析 `../` 路径穿越，然后检查规范化后路径是否在授权目录内
- **Claude's discretion:** 验证函数签名 `{ valid: boolean; error?: string }` — error 字段用于返回人类可读错误消息

### FILE-02: 敏感目录保护

- **Locked decision:** 敏感目录黑名单在主进程内存中（`BLOCKED_PATHS` Set），不持久化
- **Locked decision:** 包含系统目录：`/etc`, `/proc`, `/sys`, `/dev`, `/root`, `/boot`, `/run`, `/var/run`, `/private/var/run`, `/usr/bin`, `/usr/lib`, `/usr/sbin`, `C:\Windows`, `C:\Program Files`, `C:\ProgramData`
- **Claude's discretion:** 是否添加 Docker socket `/var/run/docker.sock` 等（暂时不添加，保持最小化）

### FILE-03: 授权目录动态管理

- **Locked decision:** Settings UI 添加新的 `security` 面板，与 `workspace` 面板分离
- **Locked decision:** `authorizedDirs` 通过 `settings:set` IPC 写入 electron-store
- **Claude's discretion:** 权限拒绝通知使用 toast 组件，不使用 modal 阻塞用户操作

### Bug Fix: authorizedDirs 持久化 BUG

- **Locked decision:** `ipc-handlers.ts` 的 `validKeys` whitelist 添加 `'authorizedDirs'`
- 这是 bug fix，与 FILE-03 需求合并在同一 task 中执行

---

## Canonical References

- `client/src/main/ipc-handlers.ts` — IPC handlers 源代码，所有 file:* handler 在此处
- `client/src/main/index.ts` — AppSettings 接口和 getAppSettings/setAppSetting 函数
- `client/src/renderer/stores/settingsStore.ts` — Zustand settings store，authorizedDirs state 和 actions
- `client/src/renderer/components/SettingsView.tsx` — 设置视图（目前无 security 面板）
- `client/src/renderer/components/OnboardingView.tsx` — Onboarding 目录选择 UI 参考
- `client/resources/openclaw-source/src/agents/sandbox/validate-sandbox-security.ts` — Gateway 层敏感目录定义
- `client/resources/openclaw-source/src/infra/fs-safe.ts` — Gateway 层路径安全函数参考

---

## Specific Ideas

- **Bug priority:** 修复 `authorizedDirs` whitelist bug 是最优先的 — Onboarding 收集的目录在重启后全部丢失
- **零信任原则:** 默认拒绝，只有在 `authorizedDirs` 列表内的路径才允许访问
- **最小权限:** 当 `authorizedDirs` 为空时，所有文件操作都被拒绝（即使是授权目录本身）
- **UI 一致性:** `AuthorizedDirsPanel` 样式与 SettingsView 其他 panel 保持一致
- **Onboarding 已有目录:** 如果 Onboarding 中已添加过目录，用户应该能在 Settings 中看到并管理它们

---

## Deferred Ideas

- **FILE-04 批量文件操作:** v2.0，不在 Phase 3 范围内
- **FILE-05 文件操作历史记录和撤销:** v2.0，不在 Phase 3 范围内
- **TOCTOU 竞态条件:** 目前只做静态路径检查，不处理 symlink 竞态（Gateway 层已有 `O_NOFOLLOW` 保护）
- **文件操作审计日志:** 记录哪些文件被访问，但不作为 Phase 3 要求

---

*Context gathered: 2026-03-24 via GSD workflow*

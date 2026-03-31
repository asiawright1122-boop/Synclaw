# SynClaw — Desktop AI Assistant (Electron + OpenClaw Gateway)

<!-- gsd-project-start source:.planning/PROJECT.md -->
## Project

**What this is:** SynClaw 是 OpenClaw 的 Electron 桌面客户端壳，让用户拥有炫酷的本地 AI 助手，安全地操作用户本地文件系统。所有 AI 能力均委托给内置的 OpenClaw Gateway。

**Core Value:** 用户可以通过自然语言对话，安全地操作用户本地文件系统，且数据永不离开用户设备。

**Current milestone:** v1.1 全面优化与安全加固 — Phase 0 安全加固、Phase 1 Workspace 统一、Phase 2 OpenClaw 能力对接、Phase 3 代码质量提升、Phase 4 打包发布

**Key decisions:**
- Electron + OpenClaw Gateway 架构（不做 Go 后端）
- Zustand 仅管理 UI 状态（业务逻辑委托 Gateway）
- electron-store 持久化设置
- `web/` 子仓库独立管理
<!-- gsd-project-end -->

<!-- gsd-stack-start source:.planning/REQUIREMENTS.md -->
## Technology Stack

- **Desktop Framework:** Electron ^28.0.0
- **UI Framework:** React ^18.2.0 + TypeScript ^5.3.0
- **Build Tool:** Vite ^5.0.0
- **Styling:** Tailwind CSS ^3.3.0
- **Animation:** Framer Motion ^10.16.0
- **State:** Zustand ^4.4.0（仅 UI 状态）
- **Backend:** OpenClaw Gateway (Node.js, 内置, 端口 18789)
- **AI:** Claude API (用户自备 API Key)
- **Packaging:** electron-builder ^24.9.0
- **Testing:** Playwright E2E

**Directory structure:**
- `client/` — Electron 客户端源码
- `client/src/main/` — Electron 主进程（index.ts, openclaw.ts, gateway-bridge.ts, logger.ts, app-settings.ts, ipc-handlers/, tray.ts, notifications.ts, updater.ts）
- `client/src/main/ipc-handlers/` — IPC handler 模块化拆分（gateway.ts, file.ts, shell.ts, app.ts, clawhub.ts, path-validation.ts）
- `client/src/preload/` — Preload 脚本（contextBridge API）
- `client/src/renderer/` — React 渲染进程（components/, stores/, hooks/, lib/）
- `openclaw-source/` — OpenClaw 源码（下载到 `client/resources/openclaw-source/`）
- `web/` — Landing page（独立 git 仓库）
<!-- gsd-stack-end -->

<!-- gsd-conventions-start source:DEVELOPMENT_GUIDELINES.md -->
## Conventions

**Architecture Principles:**
- SynClaw = OpenClaw 的桌面壳，所有 AI 能力委托给 Gateway
- 渲染进程通过 `window.openclaw` API 与 Gateway 通信（IPC → WebSocket）
- Zustand 仅管理 UI 状态，不持有业务数据
- 文件操作经由 Gateway 沙箱，不直接操作文件系统

**Code Patterns:**
- Preload API 与 IPC Handlers 1:1 对齐
- Gateway 断连时使用 fallback 数据降级，不崩溃
- 组件内 `try/catch` + `guard` 检查响应状态
- 设置类数据使用 `electron-store` 持久化，不依赖 localStorage

**TypeScript:**
- 严格模式，零 tsc 错误
- 所有 IPC 响应定义接口类型
- `// TODO:` 标注待接 API 的占位符

**Testing:**
- Playwright E2E 在 `client/e2e/` 目录
- TypeScript 编译检查：`cd client && pnpm exec tsc --noEmit`
- 主进程构建：`cd client && node scripts/build-main.mjs`
<!-- gsd-conventions-end -->

<!-- gsd-architecture-start source:SYSTEM_ARCHITECTURE.md -->
## Architecture

**进程模型：**
- Main Process → spawn OpenClaw 子进程（Node.js）→ WebSocket 连接 Gateway
- Renderer Process → IPC → Main Process → WebSocket → Gateway
- Preload 暴露 `window.openclaw` API

**核心 IPC 通道：**
- `gateway:*` — Gateway 生命周期
- `agent:*` — AI Agent 操作
- `chat:*` — 对话管理
- `session:*` — 会话管理
- `skill:*` — 技能系统
- `file:*` — 文件操作
- `window:*` — 窗口控制
- `settings:*` — 设置持久化
- `config:*` — Gateway 配置

**已知缺口（已修复 / 待后续）：**
- ✅ OpenClaw ≥ 2026.3.28 版本锁定（已升级至 npm latest）
- ✅ IPC handlers 巨石文件（已拆分为 gateway.ts/file.ts/shell.ts/app.ts/clawhub.ts，已修复）
- ✅ Gateway token 认证（从配置文件读取真实 token，已修复）
- ✅ settingsStore 双写混乱（统一走 electron-store，已修复）
- ✅ taskStore event 类型（已完整覆盖 task:* 事件，已修复）
- ✅ 统一日志系统（引入 electron-log，已修复）
- ✅ TypeScript 类型（零 tsc 错误，已修复）
- ✅ Sandbox 对接（Gateway 连接后自动通过 config.patch 应用安全加固配置，已修复）
- ✅ Control UI 入口（GatewayPanel 添加"控制面板"按钮，已修复）
- ✅ SettingsView 巨石拆分（3215行 → 195行主壳 + 13个独立面板组件，已修复）
- ✅ limitAccess 配置传播（Gateway 连接后实时重推沙箱配置，用户切换后生效，已修复）
<!-- gsd-architecture-end -->

<!-- gsd-workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- gsd-workflow-end -->

<!-- gsd-profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` — do not edit manually.
<!-- gsd-profile-end -->

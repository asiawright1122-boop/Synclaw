# SynClaw

## What This Is

SynClaw 是 OpenClaw 的 Electron 桌面客户端壳，让用户拥有炫酷的本地 AI 助手，安全地操作用户本地文件系统。所有 AI 能力（推理、文件操作沙箱、记忆存储、技能执行）均委托给内置的 OpenClaw Gateway。

## Core Value

用户可以通过自然语言对话，安全地操作用户本地文件系统，且数据永不离开用户设备。

## Requirements

### Validated

已验证的功能（从现有代码推断）：

- ✓ Electron 28 桌面客户端 — `client/src/main/index.ts`
- ✓ React 18 + TypeScript + Tailwind CSS + Framer Motion UI — `client/src/renderer/components/*.tsx`
- ✓ Zustand 状态管理（仅 UI 状态） — `client/src/renderer/stores/*.ts`
- ✓ OpenClaw Gateway 子进程管理 — `client/src/main/openclaw.ts`
- ✓ Gateway WebSocket 桥接 — `client/src/main/gateway-bridge.ts`
- ✓ IPC 通信（60+ handlers） — `client/src/main/ipc-handlers.ts` / `client/src/preload/index.ts`
- ✓ AI 对话（ChatView + agent API） — `client/src/renderer/components/ChatView.tsx`
- ✓ 文件浏览器（FileExplorer） — `client/src/renderer/components/FileExplorer.tsx`
- ✓ 技能面板（SkillsPanel） — `client/src/renderer/components/SkillsPanel.tsx`
- ✓ 设置中心（SettingsView） — `client/src/renderer/components/SettingsView.tsx`
- ✓ 系统托盘 + 动态菜单 — `client/src/main/tray.ts`
- ✓ Electron 通知系统 — `client/src/main/notifications.ts`
- ✓ 全局快捷键 + 开机自启 — `client/src/main/index.ts`
- ✓ 窗口状态持久化（electron-store） — `client/src/main/index.ts`
- ✓ electron-builder 多平台打包配置 — `client/electron-builder.yml`
- ✓ OpenClaw 源码下载脚本 — `client/scripts/download-openclaw.mjs`
- ✓ GitHub Actions CI/CD — `.github/workflows/ci.yml`, `release.yml`
- ✓ 自动更新 — `client/src/main/updater.ts`
- ✓ 右键菜单系统 — `client/src/renderer/components/ContextMenu.tsx`
- ✓ 主题系统（暗色优先） — `client/src/renderer/App.tsx`
- ✓ Markdown 渲染 + 动画 — `client/src/renderer/components/ChatView.tsx`
- ✓ 多分身系统（Avatars） — `client/src/renderer/components/Sidebar.tsx`
- ✓ 任务系统（TaskBoard + TaskDetail） — `client/src/renderer/components/TaskBoard.tsx`
- ✓ OpenClaw 下载脚本 — `client/scripts/download-openclaw.mjs`
- ✓ 积分系统（Points） — `client/src/renderer/components/CreditsPanel.tsx`
- ✓ 订阅面板 — `client/src/renderer/components/SubscriptionPanel.tsx`
- ✓ API Key 配置 — `client/src/renderer/lib/apiKeys.ts`
- ✓ IM 频道列表（channels.status） — `client/src/renderer/components/IMPanel.tsx`
- ✓ 配置持久化（electron-store） — `client/src/main/index.ts`
- ✓ 技能启用/禁用 + 过滤 — `client/src/renderer/components/SettingsView.tsx`
- ✓ RightPanel 笔记（memory.search） — `client/src/renderer/components/RightPanel.tsx`
- ✓ Playwright E2E 测试 — `client/e2e/app.spec.ts`
- ✓ TypeScript 零错误 — `tsc --noEmit` 通过
- ✓ Electron 打包生成 SynClaw.app — `release/mac-arm64/`

### Active

下一里程碑要完成的工作：

- [x] Node.js 版本检查升级为 >= 22.12.0 — Phase 1
- [ ] 文件浏览权限控制（用户授权目录）
- [ ] 技能市场 UI（ClawHub 一键安装）
- [ ] 全平台打包（macOS .dmg / Windows .exe / Linux AppImage）
- [ ] 首次启动引导（API Key 设置 + 授权目录选择）

### Out of Scope

- 本地 LLM（Ollama）— v2.0+
- 团队协作/共享技能 — v2.0+
- 企业版私有化部署 — v2.0+
- 飞书/企业微信 IM 频道接入（仅列表展示）— v2.0+

## Context

**技术栈**：Electron 28 + React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand + OpenClaw Gateway (Node.js)

**已有文档**：
- `PRODUCT_PLAN.md` — 产品定位、目标用户、功能规划、商业模式
- `SYSTEM_ARCHITECTURE.md` — 系统架构、模块设计、IPC 协议
- `DEVELOPMENT_GUIDELINES.md` — 开发准则、架构原则
- `docs/planning/progress.md` — 开发进度记录（含 Sprint 2 完成详情）

**已知遗留问题**：
- 文件操作权限控制（用户授权目录）
- `file:unwatch` API 缺失
- API Key 存储方案待优化（目前通过 skills.update 传递）
- 工作区设置（WorkspacePanel）未完全持久化
- `web/` 子仓库独立管理

## Constraints

- **Tech Stack**: Electron + React + OpenClaw Gateway — 不引入额外后端
- **数据安全**: 数据不落云端，所有文件操作经 Gateway 沙箱
- **多平台**: macOS / Windows / Linux 均需支持
- **子仓库**: `web/` 目录为独立 git 仓库，规划文档不进入 web 提交

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Electron + OpenClaw Gateway 架构 | 开源可控、无云端依赖、华丽 UI | ✓ 正确 |
| 不使用 Go 后端 | OpenClaw 已内置 Gateway | ✓ 正确 |
| Zustand 仅管理 UI 状态 | 业务逻辑委托给 Gateway | ✓ 正确 |
| electron-store 持久化设置 | 替代 localStorage，适合桌面应用 | ✓ 正确 |
| 子仓库 web/ 独立管理 | landing page 属于独立项目 | ✓ 正确 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-03-24 after GSD initialization*

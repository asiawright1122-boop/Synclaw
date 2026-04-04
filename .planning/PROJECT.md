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
- ✓ IPC 通信（60+ handlers） — `client/src/main/ipc-handlers/` / `client/src/preload/index.ts`
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
- ✓ API Key 配置 — `client/src/renderer/lib/apiKeys.ts`
- ✓ IM 频道列表（channels.status） — `client/src/renderer/components/IMPanel.tsx`
- ✓ 配置持久化（electron-store） — `client/src/main/index.ts`
- ✓ 技能启用/禁用 + 过滤 — `client/src/renderer/components/SettingsView.tsx`
- ✓ RightPanel 笔记（memory.search） — `client/src/renderer/components/RightPanel.tsx`
- ✓ Playwright E2E 测试 — `client/e2e/app.spec.ts`
- ✓ TypeScript 零错误 — `tsc --noEmit` 通过
- ✓ Electron 打包生成 SynClaw.app — `release/mac-arm64/`
- ✓ **v1.2 Exec 审批弹窗** — `ExecApprovalModal.tsx` + `execApprovalStore.ts`（384行）
- ✓ **v1.2 WEB landing page 集成** — Next.js standalone + BrowserView + Sidebar about 入口
- ✓ **v1.2 TTS / Talk Mode UI** — `VoiceModePanel.tsx` + `useTTS.ts` + `useSpeechRecognition.ts` + `TtsPanel.tsx`
- ✓ **v1.2 Avatar 多分身体系** — `AvatarListPanel.tsx` + `AvatarEditModal.tsx` + `avatarStore.ts` + 5 模板 + E2E
- ✓ **v1.2 EXEC-ENH** — `approve-once` 决策类型 + 仅本次批准按钮 + 超时 reason 字段
- ✓ **v1.2 TTS-ENH** — `currentWordIndex` word-sync 高亮 + `ontimeupdate` 追踪
- ✓ **v1.2 WEB-VERIFY** — web/ Gateway 通信 by design，主题语义一致

### Active

**v1.2 用户体验与分发完善** — 8/9 阶段已完成（仅 SIGN 待 Apple ID）

<details>
<summary>Phase 1-9 详情（点击展开）</summary>

| # | 阶段 | 功能 | 状态 |
|---|------|------|------|
| 1 | EXEC | Exec 审批弹窗 | ✅ 完成 |
| 2 | SIGN | macOS 公证签名 | ⏳ 等待 Apple ID |
| 3 | WEB | web/ landing page 集成 | ✅ 完成 |
| 4 | TTS | TTS / Talk Mode UI | ✅ 完成 |
| 5 | AVA | Avatar 多分身体系 | ✅ 完成 |
| 6 | EXEC-ENH | approve-once + 超时 reason | ✅ 完成 |
| 7 | TTS-ENH | word-sync 高亮 | ✅ 完成 |
| 8 | WEB-VERIFY | web/ 集成验证 | ✅ 完成 |
| 9 | SIGN-COMPLETE | 公证签名完成 | ⏳ 等待 Apple ID |

</details>

→ 详细 milestone：`.planning/milestones/v1.2-MILESTONE-ARCHIVE.md`
→ 归档 requirements：`.planning/milestones/v1.2-REQUIREMENTS.md`
→ 路线图：`.planning/ROADMAP.md`

> **v1.2 完成项（共 27/32 requirements，84%）：** EXEC 审批弹窗 + WEB 集成 + TTS UI + Avatar 体系 + EXEC-ENH + TTS-ENH + WEB-VERIFY
> **待完成：** macOS 公证签名（Phase 9，阻塞中，需用户提供 Apple ID）

> **已验证：** 首次启动引导（OnboardingView + API Key 设置 + 授权目录选择）已完整实现并接入了 electron-store 持久化。

## Current Milestone: v1.3 首发就绪冲刺

**Goal:** 修完所有阻塞项、完善 UX、补充测试，让 SynClaw 可以正式发布

**Target features:**
- P0（阻塞发布）：macOS 公证配置化（用户自助填写 Apple ID，无需改代码）
- P1（用户体验）：Empty states 全覆盖 + Loading skeleton 统一
- P1（质量）：单元测试（Vitest）覆盖核心 stores/hooks + Chat E2E 覆盖核心对话路径
- P2（安全）：electron-store 加密引导 + WEB_API_BASE graceful degradation
- P2（UX）：快捷键扩展（Cmd+, 打开设置 / Esc 关闭弹窗）

### Out of Scope

- 本地 LLM（Ollama）— v2.0+
- 团队协作/共享技能 — v2.0+
- 企业版私有化部署 — v2.0+
- 飞书/企业微信 IM 频道接入（仅列表展示）— v2.0+

## Context

**技术栈**：Electron 28 + React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand + OpenClaw Gateway (Node.js)

**当前进度**：
- v1.2 milestone **near-complete**：8/9 phases done，27/32 requirements satisfied
- Phase 9 SIGN 阻塞，等待用户提供 Apple Developer ID
- 新 milestone 规划可与 Phase 9 并行进行

**已有文档**：
- `PRODUCT_PLAN.md` — 产品定位、目标用户、功能规划、商业模式
- `SYSTEM_ARCHITECTURE.md` — 系统架构、模块设计、IPC 协议
- `DEVELOPMENT_GUIDELINES.md` — 开发准则、架构原则
- `.planning/milestones/v1.2-MILESTONE-ARCHIVE.md` — v1.2 milestone 完整归档
- `.planning/milestones/v1.2-REQUIREMENTS.md` — v1.2 requirements 归档
- `.planning/ROADMAP.md` — 当前路线图（指向前 milestone archive）

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

*Last updated: 2026-04-01 — v1.3 首发就绪冲刺 started*

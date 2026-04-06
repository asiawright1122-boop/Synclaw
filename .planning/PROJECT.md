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
- ✓ **v1.2 EXEC** — `ExecApprovalModal.tsx` + `execApprovalStore.ts`（384行）
- ✓ **v1.2 WEB** — Next.js standalone + BrowserView + Sidebar about 入口
- ✓ **v1.2 TTS** — `VoiceModePanel.tsx` + `useTTS.ts` + `useSpeechRecognition.ts` + `TtsPanel.tsx`
- ✓ **v1.2 Avatar** — `AvatarListPanel.tsx` + `AvatarEditModal.tsx` + `avatarStore.ts` + 5 模板 + E2E
- ✓ **v1.2 EXEC-ENH** — `approve-once` 决策类型 + 仅本次批准按钮 + 超时 reason 字段
- ✓ **v1.2 TTS-ENH** — `currentWordIndex` word-sync 高亮 + `ontimeupdate` 追踪
- ✓ **v1.2 WEB-VERIFY** — web/ Gateway 通信 by design，主题语义一致
- ✓ **v1.3 首发就绪冲刺** — Vitest 46 单元测试 + Playwright E2E CI + 9 项 UX 空状态引导 + 骨架屏 + 全局快捷键 + SecurityPanel + WEB_API_BASE 降级 + 签名状态检测 + OpenClaw 版本健康检查
- ✓ **v1.4 安全加固冲刺** — `shell:openExternal` 协议白名单 + OpenClaw Sandbox 完整对接（mode: non-main / network: none / readOnlyRoot）+ Security Audit UI + CI 版本扫描 + 移除 Google Fonts CDN + macOS 公证配置完善
- ✓ **v1.5 P2 架构债冲刺** — TypeScript 类型安全（消除 `any` / GatewayClientInterface / IPC handler 全类型化）+ EventBus 统一事件监听（`eventBus.ts` + `useOpenClaw` hook）+ 错误处理与监控（requestId 追踪 / 10s 超时 / 重试 / ErrorBoundary）+ Workspace 统一（`workspace:get` IPC handler）

<details>
<summary>Phase 1–14 详情（点击展开）</summary>

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
| 10 | TEST-UNIT | Vitest 46 单元测试 | ✅ 完成 |
| 11 | TEST-E2E | Playwright E2E + Gateway mock | ✅ 完成 |
| 12 | UX-POLISH | 空状态 + 骨架屏 + 快捷键 | ✅ 完成 |
| 13 | SECURITY | Encryption + WEB_API_BASE 降级 | ✅ 完成 |
| 14 | DEPLOY | AboutPanel 签名状态 + README 指南 | ✅ 完成 |

</details>

→ 详细 milestone：`.planning/milestones/v1.2-MILESTONE-ARCHIVE.md`、`.planning/milestones/v1.3-MILESTONE-ARCHIVE.md`
→ 归档 requirements：`.planning/milestones/v1.2-REQUIREMENTS.md`、`.planning/milestones/v1.3-REQUIREMENTS.md`、`.planning/milestones/v1.4-REQUIREMENTS.md`
→ 路线图：`.planning/ROADMAP.md`

## Current Milestone: v1.6 P3 UI 完善冲刺

**Goal:** 改善用户体验细节 — SkillsPanel 安装进度显示 + IM 频道管理 UI 精简

**Target features:**
- **SkillsPanel 安装进度** — 安装时显示实时进度条（而非无反馈）
- **IM 频道管理 UI 精简** — 移除非必要面板，减少界面复杂度


## Context

**技术栈**：Electron 28 + React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand + OpenClaw Gateway (Node.js)

**当前进度**：
- v1.2 milestone **complete**：Phases 1–9, 27/32 requirements
- v1.3 milestone **complete**：Phases 10–14, 23/23 requirements
- v1.4 milestone **complete**：Phases 15–19, 13/13 requirements
- v1.5 milestone **complete**：Phases 20–23, 12/12 requirements (P2 架构与质量债)
- v1.6 milestone **planned**：Phases 24–25, P3 UI 完善冲刺

**已有文档**：
- `BACKLOG.md` — v1.5+ 完整 backlog（P0~P3 分类）
- `PRODUCT_PLAN.md` — 产品定位、目标用户、功能规划、商业模式
- `SYSTEM_ARCHITECTURE.md` — 系统架构、模块设计、IPC 协议
- `DEVELOPMENT_GUIDELINES.md` — 开发准则、架构原则
- `.planning/milestones/v1.3-MILESTONE-ARCHIVE.md` — v1.3 milestone 完整归档
- `.planning/milestones/v1.4-ROADMAP.md` — v1.4 milestone 完整归档

## Constraints

- **Tech Stack**: Electron + React + OpenClaw Gateway — 不引入额外后端
- **数据安全**: 数据不落云端，所有文件操作经 Gateway 沙箱
- **多平台**: macOS / Windows / Linux 均需支持
- **子仓库**: `web/` 目录为独立 git 仓库，规划文档不进入 web 提交

## Key Decisions

| Decision | Rationale | Outcome |
|---------|-----------|---------|
| Electron + OpenClaw Gateway 架构 | 开源可控、无云端依赖、华丽 UI | ✓ 正确 |
| 不使用 Go 后端 | OpenClaw 已内置 Gateway | ✓ 正确 |
| Zustand 仅管理 UI 状态 | 业务逻辑委托给 Gateway | ✓ 正确 |
| electron-store 持久化设置 | 替代 localStorage，适合桌面应用 | ✓ 正确 |
| 子仓库 web/ 独立管理 | landing page 属于独立项目 | ✓ 正确 |
| Sandbox UI merged with limitAccess | 不增加配置复杂度，语义一致 | ✓ 正确（v1.4） |
| 协议拦截用系统通知而非 toast | toast 反馈攻击者，系统通知只给用户感知 | ✓ 正确（v1.4） |
| macOS 公证用户自服务 | 应用开发者提供工具，凭证由用户注入 CI | ✓ 正确（v1.4） |

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

*Last updated: 2026-04-06 — v1.6 P3 UI 完善冲刺 planned*

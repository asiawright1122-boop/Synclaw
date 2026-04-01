---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: milestone
status: Ready to plan
last_updated: "2026-04-01T01:48:20.215Z"
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 7
  completed_plans: 7
---

# STATE.md — SynClaw v1.2 用户体验与分发完善

**Version:** v1.2
**Started:** 2026-03-30
**Target:** 完善分发能力、提升用户体验

## Project Reference

See: `.planning/PROJECT.md`
See: `.planning/REQUIREMENTS.md` — v1.2 详细需求
See: `.planning/ROADMAP.md` — v1.2 阶段路线图

**Core value:** 用户可以通过自然语言对话，安全地操作用户本地文件系统，且数据永不离开用户设备。

## Phase 概览

| # | Phase | 功能 | 依赖 | 状态 | 验证日期 |
|---|-------|------|------|------|---------|
| 1 | EXEC | Exec 审批弹窗 | OpenClaw >= 2026.3.28 | ✅ 完成 | 2026-03-31 |
| 2 | SIGN | macOS 公证签名 | Apple Developer ID | ⏳ 等待用户提供证书 | — |
| 3 | WEB | web/ landing page 集成 | web/ 子仓库 | ✅ 完成 | 2026-03-31 |
| 4 | TTS | TTS / Talk Mode UI | OpenClaw talk API | ✅ 完成 | 2026-03-31 |
| 5 | AVA | Avatar 多分身体系落地 | OpenClaw avatars API | ✅ 完成 | 2026-03-31 |
| 6 | EXEC-ENH | Exec 审批增强 | — | ✅ 完成 | 2026-04-01 |

## Decisions

- Phase 5 AVA 核心 CRUD 已完整实现（ListPanel、EditModal、avatarStore、E2E）
- Phase 4 TTS 对齐 settings key（tts.autoPlay 嵌套命名）
- Phase 3 WEB 集成 Next.js standalone server 到 Electron BrowserView
- Phase 1 EXEC 完整审批链路：Gateway event → chatStore → execApprovalStore → Modal → Gateway resolve
- Phase 6 EXEC-ENH 补齐审批增强：approve-once 类型 + 仅本次批准按钮 + 超时 reason 字段
- **全部验证通过**：tsc 零错误（2026-03-31/04-01）+ 代码走读确认

## Blockers

| Blocker | 解决方式 |
|---------|---------|
| Apple Developer ID（macOS 公证） | 用户自行提供 |
| web/ 子仓库依赖 | 独立 git 工作，不阻塞主规划 |

## Active Debug Sessions

*(None)*

## Notes

- 子仓库 `web/` 独立管理，`.planning/` 文档不进入 web 提交
- v1.1 Phase 0-4 全部完成，零 TS 错误，构建通过
- macOS 公证需要：Apple Developer ID + app-specific password + 签名证书（需用户提供）
- v1.2 EXEC/WEB/TTS/AVA 4/5 阶段完成 + EXEC-ENH 6 完成，仅剩 SIGN 等待用户提供 Apple ID
- **验证方法**：tsc --noEmit 零错误 + 代码走读 + 文件存在性核查（2026-03-31/04-01）
- **E2E 测试**：5 个 spec 存在（app/avatar/exec-approval/landing-page/tts），需在完整环境中运行

---
wave: 1
depends_on: null
requirements_addressed: [R-WEB-04, R-WEB-05, R-AVA-07]
files_modified: []
autonomous: false
---

# Plan 08-WEB-VERIFY — web/ 子仓库集成验证

## Overview

验证 `web/` 子仓库与主应用的集成完整性，确认通信机制和主题一致性。此 phase 不涉及代码修改（verification-only）。

## Context

Phase 8 WEB-VERIFY 由 milestone audit 创建，用于验证以下缺口：
- **R-WEB-04**: web ↔ main app 通信未完全确认
- **R-WEB-05**: 主题一致性待验证
- **R-AVA-07**: 技能权限字段定义不明确

---

## Task 1: T-WEB-VERIFY-01 — 检查 web/ OpenClaw API 通信

<read_first>

- `web/api/credits/history/route.ts` — Credits history API route
- `web/api/notifications/route.ts` — Notifications API route
- `web/src/lib/auth.ts` — NextAuth configuration

</read_first>

<action>

确认 web/ 的 OpenClaw Gateway 集成范围：
1. 找到并阅读 `web/api/` 下所有调用 Gateway 的路由
2. 确认认证方式（NextAuth session vs device token）
3. 确认 fallback 降级策略
4. 记录结论到 08-RESEARCH.md

</action>

<acceptance_criteria>

- 所有 Gateway API 调用已识别并记录
- 认证方式已确认
- R-WEB-04 结论已写入 RESEARCH.md

</acceptance_criteria>

---

## Task 2: T-WEB-VERIFY-02 — 验证暗色主题一致性

<read_first>

- `web/src/app/globals.css` — web/ Tailwind v4 theme tokens
- `client/src/renderer/styles/globals.css` — client/ CSS variables

</read_first>

<action>

对比两个应用的暗色主题：
1. 提取 web/ 的所有 CSS 变量（背景/文本/边框/accent）
2. 提取 client/ 的对应变量
3. 比较两者的语义一致性和技术实现差异
4. 记录结论到 08-RESEARCH.md

</action>

<acceptance_criteria>

- 所有 CSS 变量已提取并对比
- R-WEB-05 结论已写入 RESEARCH.md

</acceptance_criteria>

---

## Task 3: T-WEB-VERIFY-03 — 研究 avatar 技能权限字段

<read_first>

- `web/prisma/schema.prisma` — ApiKey model with permissions
- `web/src/lib/validations.ts` — Zod schema for permissions
- `web/src/app/api/api-keys/route.ts` — API key creation route
- `client/src/renderer/lib/avatar-templates.ts` — Client avatar templates

</read_first>

<action>

确认 web/ 的权限系统与 client 的 avatar 技能模板是否相关：
1. 找到 web/ 的权限字段定义
2. 确认权限粒度（channel-level vs avatar-level）
3. 确认这是否是 R-AVA-07 的正确上下文
4. 记录结论到 08-RESEARCH.md

</action>

<acceptance_criteria>

- 权限系统类型已确认
- R-AVA-07 结论已写入 RESEARCH.md

</acceptance_criteria>

---

## Task 4: 汇总验证结果

<read_first>

- `.planning/phases/08-web-verify/08-RESEARCH.md` — 三项研究结论

</read_first>

<action>

汇总所有发现，标记 REQUIREMENTS.md 中的 requirements：
1. 更新 `.planning/REQUIREMENTS.md` traceability：R-WEB-04/05、R-AVA-07
2. 更新 `.planning/ROADMAP.md` Phase 8 状态
3. 更新 `.planning/STATE.md` Phase 概览

</action>

<acceptance_criteria>

- REQUIREMENTS.md 中 3 个 requirements 已更新状态
- ROADMAP.md Phase 8 已标记完成
- STATE.md Phase 概览包含 Phase 8

</acceptance_criteria>

---

## Verification Criteria

| 条件 | 验证方式 |
|------|---------|
| RESEARCH.md 包含 3 项研究结论 | 读取文件 |
| REQUIREMENTS.md R-WEB-04/05、R-AVA-07 已更新 | grep requirements 文件 |
| ROADMAP.md Phase 8 标记完成 | grep ROADMAP.md |

## Must-Haves

- [x] T-WEB-VERIFY-01 结论：Gateway 通信范围已确认
- [x] T-WEB-VERIFY-02 结论：主题一致性已分析
- [x] T-WEB-VERIFY-03 结论：权限字段类型已确认
- [x] REQUIREMENTS.md 更新

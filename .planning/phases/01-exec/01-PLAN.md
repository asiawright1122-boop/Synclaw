# Phase 1: EXEC — Exec 审批弹窗 — 执行计划

**Phase:** 1
**Created:** 2026-03-31
**Status:** Complete
**Requirements addressed:** EXEC-01 ~ EXEC-08

---

## Context

Phase 1 通过监听 OpenClaw Gateway 的 `exec.approval.requested` WebSocket 事件，在 AI 执行 Shell 命令前弹出审批 UI，用户批准或拒绝后调用 `exec.approval.resolve` IPC。

已实现的组件：
- `ExecApprovalModal.tsx`（384 行）— 完整 UI：风险等级（低/中/高）、倒计时（带进度条）、环境变量折叠面板、键盘快捷键（Enter=批准，Esc=拒绝）
- `execApprovalStore.ts`（169 行）— Zustand 队列管理、自动超时（默认 5 分钟）、多审批排队、resolved 缓冲区
- `App.tsx` — Modal 已挂载（React Portal → `document.body`）
- `chatStore.ts` — `exec.approval.requested` → `store.enqueue()` → Gateway `exec.approval.resolve`
- `notifications.ts` — 后台窗口自动推送通知（`exec.approval.requested`）
- IPC handlers — `exec.approval.resolve`、`exec.approvals.get` 已暴露
- `ExecApprovalsPanel.tsx` — 设置页面审批历史面板

未完成缺口：
- **拒绝时填写理由**（理由输入弹窗）
- **超时拒绝时无 reason**（自动 deny 不带 reason）
- `deny-once` 选项（Gateway 可能不支持）

---

## Plans

### Plan 01: Exec Approval 完整实现

**Objective:** 覆盖审批链路剩余缺口，完善审批历史。

```yaml
---
objective: 实现完整的 exec 审批弹窗，修复已知缺口
depends_on: []
wave: 1
autonomous: false
files_modified:
  - client/src/renderer/components/ExecApprovalModal.tsx
  - client/src/renderer/stores/execApprovalStore.ts
requirements:
  - EXEC-01 ~ EXEC-08
---
```

**Tasks:**

1. **拒绝理由输入**
   - 在 `ExecApprovalModal.tsx` 拒绝按钮触发输入弹窗
   - 参考 Gateway 反馈设计，拒绝后 agent 知道为何被拒
   - IPC 调用 `exec.approval.resolve({ decision: 'deny', reason: '...' })`

2. **超时自动拒绝带 reason**
   - `setTimeout` 触发时传入 `reason: 'Timeout (5 minutes)'`
   - Gateway 配置中记录超时原因

3. **审批历史完善**
   - `ExecApprovalsPanel.tsx`（设置面板已有）完善 UI
   - 支持按状态筛选（批准/拒绝/超时）
   - 支持按时间排序

**Acceptance Criteria:**
- 拒绝时可选填写理由，理由传递给 Gateway
- 超时自动拒绝时 reason 字段不为空
- 审批历史显示完整决策记录

**Verify:**
```bash
cd client && pnpm exec tsc --noEmit
```

---

## Verification

### TypeScript Check
```bash
cd client && pnpm exec tsc --noEmit
```
✅ Zero errors (2026-03-31)

### Code Review
- `ExecApprovalModal.tsx` — 384 行，完整 UI
- `execApprovalStore.ts` — Zustand 队列
- `App.tsx:213` — Modal 已挂载
- `client/src/renderer/components/settings/ExecApprovalsPanel.tsx` — 历史面板

---

## must_haves

| Criterion | Source |
|-----------|--------|
| `exec.approval.requested` 事件触发后 500ms 内显示弹窗 | EXEC-01 |
| 批准/拒绝操作正确传递给 Gateway | EXEC-04 |
| 多审批场景下正确排队 | EXEC-06 |
| `tsc --noEmit` 零错误 | 全局 |

---

*Plans: 1 | Waves: 1 | Created: 2026-03-31*

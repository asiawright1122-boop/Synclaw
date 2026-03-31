# Phase 6: EXEC — Exec 审批弹窗 - Context

**Gathered:** 2026-03-31
**Status:** Implementation review

---

## Phase Boundary

监听 OpenClaw Gateway 的 `exec.approval.requested` WebSocket 事件，显示审批弹窗，用户批准或拒绝后调用 `exec.approval.resolve` IPC。

---

## Implementation Decisions

### 已实现

- `ExecApprovalModal.tsx`（298行）— 完整 UI：风险等级（低/中/高）、倒计时（带进度条）、环境变量折叠面板、键盘快捷键（Enter=批准，Esc=拒绝）
- `execApprovalStore.ts`（169行）— Zustand 队列管理、自动超时（默认 5 分钟）、多审批排队、resolved 缓冲区
- `App.tsx` — Modal 已挂载（React Portal → `document.body`）
- `chatStore.ts` — `exec.approval.requested` → `store.enqueue()` → Gateway `exec.approval.resolve`
- `notifications.ts` — 后台窗口自动推送通知（`exec.approval.requested`）
- IPC handlers — `exec.approval.resolve`、`exec.approvals.get` 已暴露

### 缺失实现

- **R-EXEC-03「拒绝时填写理由」**：拒绝按钮只有 1 次点击，无理由输入弹窗
- **R-EXEC-06「批准历史查看」**：设置面板无审批历史入口（`exec.approvals.get` IPC 已有）
- **R-EXEC-02「节点来源显示」**：Modal 头部显示 `来自节点 ${current.nodeName}`（已支持但 payload 中 nodeName 可能为空）
- `ApprovalDecision` 类型缺少 `deny-once`（已有 deny 和 deny-all）— 需求 R-EXEC-03 提及「仅本次批准」，但 store 未暴露此选项
- **超时拒绝时无 reason**：自动 deny 不带 reason 给 Gateway

---

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `client/src/renderer/components/ExecApprovalModal.tsx` — 现有审批弹窗实现
- `client/src/renderer/stores/execApprovalStore.ts` — 队列 store（完整队列/超时/resolved 管理）
- `client/src/main/ipc-handlers/gateway.ts` §252-258 — `exec.approval.*` IPC handler 注册
- `client/src/main/notifications.ts` §65-86 — `exec.approval.*` 事件通知
- `.planning/REQUIREMENTS.md` §R-EXEC-01 ~ R-EXEC-07 — EXEC 详细需求

---

## Code Insights

### Reusable Assets
- `ExecApprovalModal.tsx` — Framer Motion Portal modal，Shield/Check/Ban/Clock/Terminal 图标均来自 lucide-react，可直接复用
- `execApprovalStore` — 队列逻辑完整，可直接添加审批历史 state

### Established Patterns
- Portal + AnimatePresence — Toast/Modal 通用模式（ExecApprovalModal 已遵循）
- CSS 变量驱动样式 — `var(--bg-sidebar)`, `var(--accent-gradient)` 等（Modal 已使用）
- `createPortal(content, document.body)` — App.tsx 第 296 行确认 Portal 已正确使用

### Integration Points
- `chatStore.ts` 第 380 行调用 `useExecApprovalStore.getState().enqueue()` — 无需修改
- IPC `window.openclaw.exec.approval.resolve()` — 已有，调用路径正确
- Settings 中添加审批历史入口 → `client/src/renderer/components/SettingsView.tsx`

---

## Specific Ideas

- 「拒绝时填写理由」可参考 Gateway 反馈设计，拒绝后 agent 知道为何被拒
- 审批历史可用现有 `UsagePanel` 风格，或新建 `ExecApprovalsPanel`（与 `AboutPanel` 等 panel 同级）

---

## Deferred Ideas

- `deny-once` vs `deny-all` UI 区分 — 当前只有 deny-all，等 Gateway 支持时再加
- 多窗口置顶问题 — macOS Electron 多窗口场景未测试

---

## TypeScript Status

当前唯一 tsc 错误在 Phase 4 TTS 的 `useSpeechRecognition.ts`，与 EXEC 无关。

```
src/renderer/hooks/useSpeechRecognition.ts
  error TS2395: Individual declarations in merged declaration 'SpeechRecognitionResult'
  error TS2345: SpeechRecognitionResult type mismatch
```

---

*Phase: 06-exec-approval*
*Context gathered: 2026-03-31*

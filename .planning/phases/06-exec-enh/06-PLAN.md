---
wave: 1
depends_on: null
requirements_addressed: [R-EXEC-03]
files_modified:
  - client/src/renderer/components/ExecApprovalModal.tsx
  - client/src/renderer/stores/execApprovalStore.ts
autonomous: false
---

# Plan 06-EXEC-ENH — Exec 审批增强

## Overview

关闭 v1.2 milestone audit 发现的缺口：
- **R-EXEC-03**: 缺少「仅本次批准」（approve-once）按钮
- **tech debt**: 超时拒绝未附带 reason 字段

## Context

现有实现状态（审计确认）：
- `execApprovalStore.ts` L7: `ApprovalDecision = 'approved' | 'denied' | 'deny-all'` — 有 `deny-all` 但缺少 `approve-once`
- `ExecApprovalModal.tsx` L344-359: 只有「批准」和「拒绝」两个按钮
- `execApprovalStore.ts` L90-104: 超时处理直接调用 `entry.resolve('denied')`，无 reason 字段

**Gateway exec API 预期：**
根据 R-EXEC-04 要求，`resolve(approvalId, { approved: true/false, reason? })` 是核心接口，`approve-once` 应与普通 `approved` 区别在于记录决策类型（UI 层面）。

---

## Task 1: 添加 approve-once 决策类型

<read_first>

- `client/src/renderer/stores/execApprovalStore.ts` — L1-20（类型定义）、L7（ApprovalDecision 类型）

</read_first>

<action>

在 `execApprovalStore.ts` 中做以下修改：

**1. 更新 `ApprovalDecision` 类型（L7）：**

```typescript
export type ApprovalDecision = 'approved' | 'approved-once' | 'denied' | 'deny-all'
```

**2. 更新 `ApprovalDecisionReason` 类型（L8）：**

```typescript
export type ApprovalDecisionReason = ApprovalDecision | { decision: ApprovalDecision; reason: string }
```

保持对字符串字面量的兼容（现有 `'approved'`、`'denied'`、`'deny-all'` 调用方无需修改）。

</action>

<acceptance_criteria>

- `ApprovalDecision` 类型包含 `'approved-once'` 字面量
- `ApprovalDecisionReason` 仍接受字符串字面量（向后兼容）
- `decisionOf()` / `reasonOf()` 工具函数对 `'approved-once'` 返回正确值
- `tsc --noEmit` 无新增错误

</acceptance_criteria>

---

## Task 2: 在 Modal 中添加「仅本次批准」按钮

<read_first>

- `client/src/renderer/components/ExecApprovalModal.tsx` — L343-384（Footer 按钮区）
- `client/src/renderer/stores/execApprovalStore.ts` — L86-124（enqueue/resolveCurrent）

</read_first>

<action>

在 `ExecApprovalModal.tsx` 的 Footer 按钮区（L343-384）做以下修改：

**1. 添加 `handleApproveOnce` 回调（L86-88 后添加）：**

```typescript
const handleApproveOnce = useCallback(() => {
  resolveCurrent('approved-once')
}, [resolveCurrent])
```

**2. 在「批准」按钮（L344-358）后添加「仅本次批准」按钮：**

```typescript
<button
  type="button"
  onClick={handleApproveOnce}
  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
  style={{
    background: 'rgba(0, 210, 170, 0.1)',
    border: '1px solid rgba(0, 210, 170, 0.3)',
    color: 'var(--accent-cyan)',
  }}
>
  <CheckCircle className="w-4 h-4" />
  仅本次批准
</button>
```

按钮位于「批准」和「拒绝」之间，与「批准」用相同风险色区分（`accent-cyan`），`CheckCircle` 从 lucide-react 导入。

</action>

<acceptance_criteria>

- 「仅本次批准」按钮显示在「批准」和「拒绝」之间
- 点击后 `resolveCurrent('approved-once')` 被调用
- 按钮样式与整体 UI 一致（dark theme，使用 CSS 变量）
- `CheckCircle` icon 从 lucide-react 已导入（L10-13 应包含）

</acceptance_criteria>

---

## Task 3: 超时拒绝附带 reason 字段

<read_first>

- `client/src/renderer/stores/execApprovalStore.ts` — L86-104（enqueue 中的 timeout 处理）

</read_first>

<action>

在 `execApprovalStore.ts` 的超时处理中（L90-104）做以下修改：

将 `entry.resolve('denied')` 替换为附带 reason：

```typescript
entry.resolve({ decision: 'denied', reason: `自动拒绝：审批超时（${Math.round((req.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 60000)} 分钟）` })
```

这样拒绝理由会显示在 chatStore 的审批历史中，帮助用户理解为何命令未执行。

</action>

<acceptance_criteria>

- 超时触发的 resolve 调用包含 `{ decision: 'denied', reason: '自动拒绝：审批超时（X 分钟）' }` 格式
- reason 文本包含实际超时分钟数
- `tsc --noEmit` 无新增错误

</acceptance_criteria>

---

## Task 4: 验收测试

<read_first>

- `client/src/renderer/stores/execApprovalStore.ts` — L1-20（类型和工具函数）
- `client/src/renderer/components/ExecApprovalModal.tsx` — L73-137（完整 Modal JSX）

</read_first>

<action>

**1. TypeScript 编译检查：**

```bash
cd client && pnpm exec tsc --noEmit
```

期望：零错误

**2. 功能验证（代码走读确认）：**

- `ApprovalDecision` 包含 `'approved-once'`
- `handleApproveOnce` 在 Modal Footer 中存在
- 超时 resolve 包含 reason 对象
- `decisionOf('approved-once')` 返回 `'approved-once'`

</action>

<acceptance_criteria>

- `tsc --noEmit` 零错误
- `ApprovalDecision` 类型已包含 `'approved-once'`
- Modal Footer 包含三个按钮：批准 / 仅本次批准 / 拒绝
- 超时拒绝 reason 包含超时分钟数

</acceptance_criteria>

---

## Verification Criteria

| 条件 | 验证方式 |
|------|---------|
| `tsc --noEmit` 零错误 | CLI |
| `ApprovalDecision` 包含 `'approved-once'` | grep `'approved-once'` execApprovalStore.ts |
| Modal Footer 有三个按钮 | grep `仅本次批准` ExecApprovalModal.tsx |
| 超时 resolve 带 reason | grep `自动拒绝：` execApprovalStore.ts |

## Must-Haves

- [x] `ApprovalDecision` 类型包含 `'approved-once'`
- [x] Modal Footer 三个按钮并存
- [x] 超时拒绝附带 reason
- [x] tsc 零错误

# Phase 5: AVA — Avatar 多分身体系落地 — Context

**Gathered:** 2026-03-31
**Status:** Complete

---

## Phase Boundary

完整的 Avatar CRUD 管理：创建/编辑/删除分身，选定分身作为当前对话 Agent。

---

## Implementation Status

### 已实现

- **`AvatarListPanel.tsx`** — 分身列表组件：
  - 分身卡片展示（emoji、颜色、名称）
  - 创建表单（emoji 表情选择器、颜色选择器）
  - 模板创建（5 个官方模板）
  - 搜索过滤
  - CRUD 操作（新建/编辑/删除/激活）

- **`AvatarEditModal.tsx`** — 编辑弹窗：
  - Slide-up 动画（Framer Motion）
  - Emoji 选择器
  - 颜色选择器
  - 模板选择器
  - Personality editor（性格描述）

- **`avatarStore.ts`** — Zustand 状态管理：
  - `loadAvatars()` — 从 Gateway 加载
  - `createAvatar()` / `updateAvatar()` / `deleteAvatar()`
  - `activateAvatar()` — 切换当前分身
  - Demo mode fallback（Gateway 不可用时）

- **`avatar-templates.ts`** — 5 个官方模板：
  - Programmer（程序员）
  - Writer（写作助手）
  - PM（产品经理）
  - Code Reviewer（代码审查员）
  - Data Analyst（数据分析师）

- **`AvatarSelector.tsx`** — 头像选择器（ChatView 用）
- **`AvatarSettingsPanel.tsx`** — 设置面板 Avatar 配置
- **`client/e2e/avatar.spec.ts`** — Playwright E2E 测试

### 关键文件

```
client/src/renderer/components/AvatarListPanel.tsx     ← 列表面板
client/src/renderer/components/AvatarEditModal.tsx     ← 编辑弹窗
client/src/renderer/stores/avatarStore.ts             ← Zustand store
client/src/renderer/lib/avatar-templates.ts           ← 官方模板
client/src/renderer/components/AvatarSelector.tsx     ← 选择器
client/src/renderer/components/settings/AvatarSettingsPanel.tsx ← 设置面板
client/e2e/avatar.spec.ts                            ← E2E 测试
```

---

## Canonical References

- `client/src/renderer/components/AvatarListPanel.tsx` — 分身列表
- `client/src/renderer/components/AvatarEditModal.tsx` — 编辑弹窗
- `client/src/renderer/stores/avatarStore.ts` — 状态管理
- `client/src/renderer/lib/avatar-templates.ts` — 官方模板

---

## Notes

- `data-testid` 属性需确认（如 avatar-card）— 来自遗留决策
- Avatar 切换后需确认 Gateway 端同步生效

---

*Context gathered: 2026-03-31*

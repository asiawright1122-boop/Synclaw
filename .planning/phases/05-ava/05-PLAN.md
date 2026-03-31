# Phase 5: AVA — Avatar 多分身体系落地 — 执行计划

**Phase:** 5
**Created:** 2026-03-31
**Status:** Complete

---

## Context

Phase 5 实现完整的 Avatar 多分身体系，包括 CRUD、模板系统和 ChatView 头像切换。

---

## Plans

### Plan 01: Avatar 多分身体系验证

**Objective:** 验证 Avatar 体系完整实现。

```yaml
---
objective: 验证 Avatar CRUD 和切换功能
depends_on: []
wave: 1
autonomous: false
files_modified: []
requirements:
  - AVA-01 ~ AVA-08
---
```

**Tasks:**

1. **验证 AvatarListPanel**
   - 分身卡片列表展示
   - 创建表单和模板创建
   - CRUD 操作正确调用 Gateway API

2. **验证 AvatarEditModal**
   - Slide-up 动画
   - Emoji/颜色/模板选择器

3. **验证 avatarStore**
   - Gateway API 集成
   - Demo mode fallback

4. **验证 5 个官方模板**
   - 每个模板可一键创建分身

5. **验证 ChatView 头像切换**
   - `AvatarSelector.tsx` 集成

6. **验证 E2E 测试**
   - `client/e2e/avatar.spec.ts` 存在

**Acceptance Criteria:**
- 可创建/编辑/删除 Avatar
- 选中 Avatar 后对话使用对应 prompt
- 5 个官方模板可一键创建

**Verify:**
```bash
cd client && pnpm exec tsc --noEmit
```

---

## Verification

| 检查项 | 结果 |
|--------|------|
| `tsc --noEmit` | ✅ 零错误（2026-03-31） |
| AvatarListPanel | ✅ 完整 |
| AvatarEditModal | ✅ 完整 |
| avatarStore | ✅ Zustand + demo fallback |
| 5 个官方模板 | ✅ 模板文件存在 |
| AvatarSelector | ✅ ChatView 集成 |
| E2E 测试 | ✅ avatar.spec.ts 存在 |

---

## must_haves

| Criterion | Source |
|-----------|--------|
| 可创建/编辑/删除 Avatar | AVA-02 ~ AVA-04 |
| 选中 Avatar 后对话使用对应 prompt | AVA-05 |
| 5 个官方模板可一键创建 | AVA-07 |
| E2E 测试通过 | AVA-08 |

---

*Plans: 1 | Waves: 1 | Created: 2026-03-31*

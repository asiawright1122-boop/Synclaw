# Phase 3: WEB — web/ landing page 集成 — 执行计划

**Phase:** 3
**Created:** 2026-03-31
**Status:** Complete

---

## Context

Phase 3 将 web/ landing page 集成到 SynClaw Electron 客户端，通过 BrowserView 加载。

---

## Plans

### Plan 01: Landing Page 集成

**Objective:** 验证 landing page 集成完整。

```yaml
---
objective: 验证 landing page 集成并完成文档
depends_on: []
wave: 1
autonomous: false
files_modified: []
requirements:
  - WEB-01 ~ WEB-08
---
```

**Tasks:**

1. **验证 BrowserView 生命周期**
   - `startLandingProcess()` — Next.js server 启动
   - `createLandingPageView()` — BrowserView 创建
   - 异常处理和优雅降级

2. **验证 IPC 链路**
   - `landing:isAvailable` / `landing:show` / `landing:hide`
   - Sidebar 调用链路

3. **打包验证**
   - `electron-builder` extraResources 包含 web/standalone/
   - 打包后路径正确

**Acceptance Criteria:**
- 「关于」入口加载 landing page，无白屏
- web/ 不存在时构建成功（优雅降级）
- 暗色主题一致

**Verify:**
```bash
cd client && pnpm exec tsc --noEmit
```

---

## Verification

| 检查项 | 结果 |
|--------|------|
| `tsc --noEmit` | ✅ 零错误（2026-03-31） |
| BrowserView 主进程管理 | ✅ index.ts lines 225-398 |
| landing IPC handlers | ✅ app.ts lines 60-84 |
| Sidebar 入口按钮 | ✅ Sidebar.tsx |
| web/ standalone 存在 | ✅ 项目根目录 |

---

## must_haves

| Criterion | Source |
|-----------|--------|
| 「关于」入口加载 landing page | WEB-01 |
| extraResources 包含 web/ | WEB-03 |
| 优雅降级（web/ 不存在时隐藏入口） | WEB-06 |
| 暗色主题一致 | WEB-07 |

---

*Plans: 1 | Waves: 1 | Created: 2026-03-31*

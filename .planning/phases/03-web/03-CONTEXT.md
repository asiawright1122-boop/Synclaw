# Phase 3: WEB — web/ landing page 集成 — Context

**Gathered:** 2026-03-31
**Status:** Complete

---

## Phase Boundary

在 SynClaw 桌面客户端内置 web/ landing page，通过 Electron BrowserView 加载，用户可从 Sidebar 打开「关于」页面。

---

## Implementation Status

### 已实现

- **`client/src/main/index.ts`** — 完整的 BrowserView 生命周期（lines 225-398）：
  - `startLandingProcess()` — 启动 Next.js standalone server
  - `createLandingPageView()` — 创建 BrowserView
  - `showLandingPage()` / `hideLandingPage()` / `destroyLandingPageView()`
  - 从 `web/standalone/` 加载静态资源

- **`client/src/main/ipc-handlers/app.ts`** — 三个 IPC handlers（lines 60-84）：
  - `landing:isAvailable` — 查询 landing page 是否可用
  - `landing:show` — 显示 landing page
  - `landing:hide` — 隐藏 landing page

- **`client/src/renderer/components/Sidebar.tsx`** — 「关于」按钮：
  - 收起态（lines 292-302）
  - 展开态（lines 585-595）
  - 调用 `window.electronAPI.landing.show()`

- **`web/`** — Next.js standalone 项目存在于项目根目录，包含 `.next/`, `api/`, `node_modules/`

- **`electron-builder.yml`** — `extraResources` 包含 `web/standalone/`

### 关键文件

```
client/src/main/index.ts                             ← BrowserView 管理
client/src/main/ipc-handlers/app.ts                  ← landing IPC
client/src/renderer/components/Sidebar.tsx           ← 关于按钮
web/standalone/                                      ← Next.js 静态产物
client/electron-builder.yml                         ← extraResources
```

---

## Canonical References

- `client/src/main/index.ts` — BrowserView lifecycle
- `client/src/main/ipc-handlers/app.ts` — landing IPC handlers
- `client/src/renderer/components/Sidebar.tsx` — about button
- `web/` — Next.js project

---

*Context gathered: 2026-03-31*

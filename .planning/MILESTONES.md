# Milestones

## v1.7 Backlog 清理 + 性能优化 (Shipped: 2026-04-08)

**Phases completed:** 5 phases (26–30), 20/20 requirements

**Key accomplishments:**

- **Phase 26 ONB:** Gateway 状态统一管理 — gatewayStore + useGatewayStatus hook + DisconnectBanner 断连提示 + gateway.ping() API Key 验证
- **Phase 27 EMPTY:** 空状态全补全 — AvatarListPanel/TaskBoard/SkillsMarketPanel/McpPanel 四个面板均有引导 CTA
- **Phase 28 UX:** UX 体系完善 — Avatar Header 指示器 + 删除状态重置 + Cmd+Shift+M 快捷键 + 完整 Toast 通知 + ClawHub CLI 检测 + WEB_API_BASE 降级
- **Phase 29 PERF:** 性能优化（IPC）— 启动链路计时分析 + 非首屏组件懒加载（React.lazy）+ RPC 请求去重（500ms TTL）+ 热点方法 per-method TTL 缓存
- **Phase 30 PERF:** 性能优化（React）— 14 个组件 Zustand selector 精确化 + ChatView CSS contain + 选择性动画 + gatewayStore 内存泄漏修复

**Known gaps:**
- SkillsPanel.tsx 预存 TypeScript 错误（不在 v1.7 范围）
- macOS 公证待用户提供 Apple ID

---

## v1.6 P3 UI 完善冲刺 (Shipped: 2026-04-06)

**Phases completed:** 2 phases (24–25), 7/7 requirements

**Key accomplishments:**

- **Phase 24 SKL:** SkillsPanel 安装进度 — `skill:progress` / `skill:installed` / `skill:error` 事件监听；内联进度条显示安装状态；安装失败显示错误 toast
- **Phase 25 IM:** IM 频道管理 UI 精简 — 删除占位"编辑"按钮；平台选择器默认隐藏 desc（hover tooltip）；空状态 CTA 改为"添加第一个频道"；频道列表改为紧凑行布局

**Known gaps:**
- none

---

## v1.5 P2 架构债冲刺 (Shipped: 2026-04-06)

**Phases completed:** 4 phases (20–23), 12/12 requirements

**Key accomplishments:**

- **Phase 20 TS:** TypeScript 类型安全 — `GatewayClientInterface` + `GatewayClientOptionsInterface` 消除所有 `@ts-expect-error`；IPC handler 全类型化；`fs.watch` 强制 cast 修复
- **Phase 21 EVT:** EventBus 统一事件监听 — `eventBus.ts` 类型化 EventBus；`useOpenClaw` React Context；chatStore 通过 EventBus 广播 agent/chat/exec 事件
- **Phase 22 ERR:** 错误处理与监控 — `crypto.randomUUID()` requestId 追踪；10s 超时；exec/file 方法自动重试；electron-log 未捕获异常持久化
- **Phase 23 WS:** Workspace 统一 — `workspace:get` IPC handler；`getWorkspacePath()` 从 Gateway `config.get` RPC 获取路径

**Known gaps:**
- WS-02: FileExplorer 尚未完全迁移使用 `workspace:get`（`authorizedDirs` + `limitAccess` 仍是当前文件访问控制机制）

---

## v1.4 安全加固冲刺 (Shipped: 2026-04-06)

**Phases completed:** 5 phases (15–19), 1 plan, 9 tasks

**Key accomplishments:**

- **Phase 15 SHELL-SECURITY:** `shell:openExternal` 协议白名单 — 仅允许 `https:`/`mailto:`，显式拒绝 `javascript:`/`data:`/`file:`/`ftp:`；系统桌面通知告知拦截；结构化错误返回
- **Phase 16 SANDBOX:** OpenClaw Sandbox 完整对接 — `sandbox.mode: non-main`、`docker.network: none`、`docker.readOnlyRoot: true`；SecurityPanel 执行沙箱状态展示（复用 limitAccess 开关）
- **Phase 17 AUDIT:** Security Audit UI — `openclaw security audit --json` 集成 SecurityPanel；CI OpenClaw 版本扫描（已知漏洞检测）
- **Phase 18 FONTS:** 移除 Google Fonts CDN 隐私泄露 — 全局字体改为系统字体栈
- **Phase 19 NOTARY:** macOS 公证配置完善 — `notarize.mjs` 脚本完整、`electron-builder.yml` 配置就绪；AboutPanel 区分签名与公证状态；真实公证待用户提供 Apple ID

---

## v1.3 首发就绪冲刺 (Shipped: 2026-04-01)

**Phases completed:** 5 phases (10–14), 5 plans

**Key accomplishments:**

- Vitest + @testing-library/react 单元测试（46 tests）
- Playwright E2E + Gateway mock for CI
- 9 项 UX 空状态引导 + 骨架屏加载动画
- SecurityPanel 加密状态 + WEB_API_BASE 降级
- AboutPanel 签名状态检测 + README 签名配置指南

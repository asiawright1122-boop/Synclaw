# Milestones

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

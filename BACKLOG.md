# SynClaw Backlog — v1.4+

> 整理自 `.planning/` 历史文档（2026-03-25 ~ 2026-04-05）
> 状态标注截至 2026-04-05

---

## P0 — 发布阻塞（应在 v1.4 完成）

### P0-1: macOS 公证签名 ⏳

| 项目 | 状态 |
|------|------|
| electron-builder `notarize: autoSubmit: true` 配置 | ✅ 已完成 |
| 签名状态 UI（Settings→About） | ✅ 已完成 |
| README 签名指南 | ✅ 已完成 |
| **实际打包提交 Apple 公证** | ⏳ 待用户配置 Apple ID |

> 来源: v1.2 Phase 9, v1.3 DEPLOY-01/02/03

---

## P1 — 安全债（应在 v1.4 完成）

### P1-1: shell:openExternal 协议白名单

| 项目 | 状态 |
|------|------|
| 阻止 `javascript:` 协议 | ❌ 未实现 |
| 阻止 `data:` 协议（可选） | ❌ 未实现 |
| 仅允许 `https:` 和 `mailto:` | ❌ 未实现 |

> 来源: PHASE-OPTIMIZATION.md R-09

### P1-2: OpenClaw Sandbox 完整对接

| 项目 | 状态 |
|------|------|
| `tools.deny: ['operator.admin']` 已在 gateway-bridge 配置 | ✅ 已完成 |
| OpenClaw sandbox config（mode: non-main）对接 | ❌ 未实现 |
| `sandbox.docker.network: "none"` | ❌ 未实现 |
| `sandbox.docker.readOnlyRoot: true` | ❌ 未实现 |
| Sandbox 开关 UI（默认开启） | ❌ 未实现 |

> 来源: PHASE-OPTIMIZATION.md S-09 ~ S-12

### P1-3: OpenClaw Security Audit UI

| 项目 | 状态 |
|------|------|
| SecurityPanel 面板 UI | ✅ 已完成（SEC-01~04） |
| `openclaw security audit --json` 运行时调用 | ❌ 未实现 |
| 审计结果在 SynClaw UI 展示 | ❌ 未实现 |
| CI 中添加 CVE 版本扫描 | ❌ 未实现 |

> 来源: PHASE-OPTIMIZATION.md S-08, O-13, P-04

### P1-4: google Fonts CDN 隐私泄露

| 项目 | 状态 |
|------|------|
| `globals.css` 中的 Google Fonts import | ❌ 未检查 |
| 改为打包字体或系统字体栈 | ❌ 未处理 |

> 来源: PHASE-OPTIMIZATION.md R-07

---

## P2 — 架构与质量债（v1.4 或 v2.0）

### P2-1: TypeScript 类型安全

| 项目 | 状态 |
|------|------|
| `gateway-bridge.ts` 中 `any` 动态导入（TD-01） | ❌ 未解决 |
| `chatStore.ts` 事件类型与 Gateway 对齐（TD-02） | ❌ 未解决 |
| IPC handler 类型化参数和返回值（Q-03） | ❌ 未解决 |
| 统一 `AppSettings` 接口定义 | ✅ 已完成（app-settings.ts） |

> 来源: AUDIT.md TD-01~02

### P2-2: OpenClawEventBus 统一事件监听

| 项目 | 状态 |
|------|------|
| chatStore 和 openclawStore 各注册 `window.openclaw.on()` | ⚠️ 有 idempotency guard，可接受 |
| 合并为统一 EventBus | ❌ 未实现 |
| React Context 封装 `window.openclaw` | ❌ 未实现 |
| IPC 调用超时和重试逻辑（Q-08） | ❌ 未实现 |

> 来源: AUDIT.md TD-03, PHASE-OPTIMIZATION.md Q-06~Q-08

### P2-3: 错误处理与监控

| 项目 | 状态 |
|------|------|
| 全局 React ErrorBoundary（Q-10） | ❌ 未实现 |
| 主进程异常上报 electron-log（Q-11） | ⚠️ 部分完成（electron-log 已安装） |
| Operation tracing（request ID） | ❌ 未实现 |

> 来源: PHASE-OPTIMIZATION.md Q-10~Q-12

### P2-4: Workspace 统一

| 项目 | 状态 |
|------|------|
| FileExplorer 使用 OpenClaw workspace 路径 | ❌ 未实现 |
| 移除独立 workspace 创建逻辑 | ❌ 未实现 |
| electron-store / Gateway config 职责分离 | ⚠️ 部分完成（W-06） |

> 来源: PHASE-OPTIMIZATION.md W-01 ~ W-08

---

## P3 — 功能增强（v2.0 范围）

| 项目 | 说明 | 状态 |
|------|------|------|
| Control UI 集成（O-01~O-03） | 内置 WebView 访问 OpenClaw 控制面板 | ❌ 未实现 |
| Keytar / macOS Keychain 集成 | API Key 安全存储 | ❌ 未实现 |
| Local LLM (Ollama) | v2.0+ |
| 团队协作/共享技能 | v2.0+ |
| 企业版私有化部署 | v2.0+ |
| SkillsPanel 安装进度状态（TD-05） | 安装时显示实时进度 | ❌ 未实现 |
| IM 频道管理 UI 精简（O-16~O-19） | 删除非必要面板 | ❌ 未实现 |
| 移动端触控优化 | Electron 桌面非主要场景 |

> 来源: PROJECT.md Out of Scope, PHASE-OPTIMIZATION.md Phase 2

---

## 已完成项（无需再处理）

以下来自历史规划的任务已在此前 milestone 中完成：

| 任务 | 完成位置 |
|------|----------|
| `ipc-handlers/index.ts` 巨石拆分（R-01） | ✅ 拆分为 8 个子文件，最大 302 行 |
| 统一日志系统（R-03） | ✅ electron-log v5.4.3 已安装并接入 |
| SettingsView.tsx 巨石拆分（O-12） | ✅ settings/ 目录 16 个独立面板，207 行 |
| SecurityPanel（O-13） | ✅ v1.3 SEC-01~04 |
| GatewayPanel（O-14） | ✅ 已有 GatewayPanel.tsx |
| CHANGELOG.md 更新（P-02） | ✅ 本次整理已更新 |
| download-openclaw.mjs 版本锁定（P-03） | ✅ package.json `"openclawVersion": "2026.4.2"` |
| TTS UI 完整实现（O-08~O-10） | ✅ VoiceModePanel + useTTS + TtsPanel |
| Playwright E2E 测试（Q-13） | ✅ 7 个 E2E 测试用例 |
| OpenClaw 版本健康检查（S-02） | ✅ openclaw.ts checkVersion() |
| Playwright CI 启用 | ✅ 移除 `if: false`，配置 gateway-mock |

---

*整理日期: 2026-04-05*
*下次审查: v1.4 milestone 开始时*

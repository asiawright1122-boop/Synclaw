# v1.1 全面优化与安全加固

> **⚠️ 归档状态：** 本文档已过时（2026-03-25）。大部分内容已在 v1.2/v1.3 milestone 中完成或不再适用。
> **最新 backlog：** 参见 `BACKLOG.md`
> **本次整理：** 2026-04-05

**Milestone:** v1.1 全面优化与安全加固
**Created:** 2026-03-25
**Core Value:** 用户可以通过自然语言对话，安全地操作用户本地文件系统，且数据永不离开用户设备。

---

## 背景

经过对 SynClaw 项目和 OpenClaw 官方文档/安全的全面梳理，发现：

1. **OpenClaw 有多个严重 CVE** — 包括 WebSocket 权限提升（CVSS 10.0）、认证绕过等
2. **SynClaw 有多个架构问题** — workspace 脱节、屎山代码、安全加固未完成
3. **大量 OpenClaw 能力未被对接** — Sandbox、Control UI、TTS/Talk、Tool Loop Detection 等
4. **代码质量整体需要提升** — TypeScript 类型安全、日志系统、错误处理

---

## OpenClaw 安全漏洞审计（与 SynClaw 相关）

### 已披露 CVE（按 CVSS 评分排序）

| CVE | 描述 | CVSS | SynClaw 影响 | 修复版本 |
|-----|------|------|-------------|---------|
| GHSA-rqpp-rjj8-7wv8 | WebSocket scope 权限提升，共享 token 连接可自声明 `operator.admin` | **10.0 Critical** | ⚠️ **极高风险**：SynClaw gateway-bridge 使用空 token + `scopes: ['operator.admin']` 声明，存在 scope 声明攻击面 | ≥ 2026.3.12 |
| CVE-2026-28446 | Voice-call 扩展认证绕过，空 caller ID + 后缀匹配漏洞 | **9.4 Critical** | ⚠️ 高风险：若用户启用了 voice-call 扩展 | ≥ 2026.2.1 |
| CVE-2026-32302 | trusted-proxy 模式下 WebSocket Origin 验证绕过 | **8.1 High** | ⚠️ 中风险：若配置了 trusted-proxy（SynClaw 默认不用） | ≥ 2026.3.11 |
| CVE-2026-27488 | Cron webhook 发送 SSRF 攻击 | 6.9 Medium | ⚠️ 中风险：若用户配置了 cron webhook | ≥ 2026.2.19 |
| CVE-2026-26326 | `skills.status` 方法暴露敏感配置（Discord token 等） | 5.3 Medium | ⚠️ 中风险：SynClaw 调用了 `skills.status` | ≥ 2026.2.14 |
| CVE-2026-27485 | Package skill script symlink 攻击 | 4.6 Medium | ⚠️ 中风险：若用户安装了不受信任的 skill | ≥ 2026.2.19 |
| CVE-2026-27007 | Config hash 不稳定导致 stale container 重用 | 4.8 Medium | ⚠️ 低风险：配置完整性问题 | ≥ 2026.2.15 |
| CVE-2026-27576 | Local Stdio Bridge 性能问题 | 4.8 Medium | ⚠️ 低风险：过大的 prompt payload | ≥ 2026.2.19 |

### SynClaw 当前安全态势评估

**致命风险（Critical）：**
1. `gateway-bridge.ts` 使用空 token 连接，但声明了 `scopes: ['operator.admin']` — 这是 GHSA-rqpp-rjj8-7wv8 的攻击面
2. 没有使用 OpenClaw 的 Sandbox 隔离，仅靠路径白名单无法防止 `exec` 逃逸
3. OpenClaw 版本未知（未锁定版本，可能下载了有漏洞的旧版本）

**高风险：**
4. API Key 存储在 electron-store（明文或弱加密），非 Keychain
5. 没有利用 OpenClaw 的 `tools.loopDetection` 防止工具死循环
6. `shell:openExternal` 白名单不完整（缺少 `javascript:` 等协议阻止）
7. 没有运行 `openclaw security audit` 定期审计

**中风险：**
8. Google Fonts 通过 CDN 加载（隐私泄露）
9. 没有日志系统（无法审计操作）
10. 没有对接 OpenClaw 的 `controlUi` 认证

### OpenClaw 推荐的安全加固基线

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",           // 本地绑定，永不暴露公网
    auth: { mode: "token", token: "替换为强随机token" },
  },
  tools: {
    profile: "messaging",          // 最小工具集
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },  // 文件工具仅限 workspace
    exec: { security: "deny", ask: "always" },  // exec 需要每次审批
    elevated: { enabled: false }, // 禁用特权执行
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
  },
}
```

---

## Phase 0: 安全紧急加固（Critical Fixes）

**目标：** 修复最严重的安全漏洞和架构问题，不做 UI 改动。

### 0.1 OpenClaw 版本锁定与安全更新

- [ ] **S-01**: 在 `download-openclaw.mjs` 中强制指定最新稳定版本（≥ 2026.3.12）
- [ ] **S-02**: 添加版本健康检查，启动时验证 OpenClaw 版本不低于最新 CVE 修复版本
- [ ] **S-03**: 在 CI 中添加 OpenClaw 版本扫描，检查已知漏洞版本

### 0.2 Gateway 认证安全

- [ ] **S-04**: 生成强随机 token（`openssl rand -hex 32`）替代空 token
- [ ] **S-05**: 将 token 存储在 macOS Keychain / Windows Credential Store，而非 electron-store
- [ ] **S-06**: gateway-bridge 连接时正确使用 token（不再声明 `operator.admin` scope）
- [ ] **S-07**: 验证 Gateway auth 配置符合加固基线（bind: loopback, auth.mode: token）
- [ ] **S-08**: 运行时定期运行 `openclaw security audit --json`，在 SynClaw 中展示安全警告

### 0.3 Sandbox 对接（替代白名单）

- [ ] **S-09**: 对接 OpenClaw `sandbox` 配置，默认启用 `mode: "non-main"`
- [ ] **S-10**: 配置 `sandbox.docker.network: "none"` 禁用网络访问
- [ ] **S-11**: 配置 `sandbox.docker.readOnlyRoot: true` 只读根目录
- [ ] **S-12**: 移除或弱化自建的路径白名单（保留敏感目录保护作为纵深防御）

### 0.4 代码重构（屎山清理）

- [ ] **R-01**: 拆分 `ipc-handlers.ts`（1951行巨石）为子模块：
  - `ipc-handlers/gateway.ts` — Gateway 透传（~80个 handler）
  - `ipc-handlers/file.ts` — 文件操作（12个 handler + path validation）
  - `ipc-handlers/clawhub.ts` — ClawHub CLI
  - `ipc-handlers/system.ts` — window/dialog/shell/app handlers
- [ ] **R-02**: 移除所有 handler 内部的 `require('./index.js')`，改用顶层 import
- [ ] **R-03**: 统一日志系统（引入 electron-log 替代分散的 console.log）
- [ ] **R-04**: 统一 TypeScript 类型：
  - 从 OpenClaw 源码导入类型定义
  - 为 Gateway API 生成 TypeScript 类型
  - 消除所有 `any` 类型
- [ ] **R-05**: 修复 `taskStore.ts` 中的错误 event 类型（移除不存在的 `task:*` 事件监听）
- [ ] **R-06**: 修复 `settingsStore.ts` 双写混乱 — 确定 electron-store 为 SynClaw UI 配置，Gateway config 为运行时配置，各自独立
- [ ] **R-07**: 移除 `globals.css` 中的 Google Fonts CDN import，改为打包字体
- [ ] **R-08**: 统一错误返回格式（`{ success, data?, error? }` 贯穿所有 IPC handler）
- [ ] **R-09**: 修复 `shell:openExternal` 协议白名单（阻止 `javascript:` 协议）

**验收标准：**
- `tsc --noEmit` 零错误
- 所有 handler 从顶层 import，不再有 handler 内 require
- ipc-handlers 目录有4个子文件，每个不超过 400 行
- 日志统一通过 electron-log 输出，有文件滚动
- `openclaw security audit` 输出在 SynClaw 日志中可见

---

## Phase 1: Workspace 统一与架构对齐

**目标：** 让 SynClaw 的 workspace 和 OpenClaw Gateway 的 workspace 统一，消除双目录隔离问题。

### 1.1 Workspace 统一

- [ ] **W-01**: 读取 OpenClaw `agents.defaults.workspace` 配置，使用其路径作为 SynClaw FileExplorer 的根目录
- [ ] **W-02**: 移除 `~/.openclaw-synclaw/workspace` 的创建逻辑（不再创建独立 workspace）
- [ ] **W-03**: FileExplorer 初始加载 OpenClaw workspace 路径
- [ ] **W-04**: 首次引导时让用户选择 OpenClaw workspace 目录（而非创建新的）
- [ ] **W-05**: Authorized Dirs 与 OpenClaw `agents.defaults.workspace` 保持同步

### 1.2 数据流重构

- [ ] **W-06**: 分离 electron-store 和 Gateway config 的职责边界：
  - electron-store = SynClaw UI 配置（theme, fontSize, onboarding 状态，UI panel 状态）
  - Gateway config = OpenClaw 运行时配置（model, sandbox, tools, workspace，heartbeat）
- [ ] **W-07**: 删除 `settingsStore.ts` 中对 Gateway config 的写入（只读同步）
- [ ] **W-08**: 添加 Gateway config 只读同步到 electron-store 的逻辑

**验收标准：**
- FileExplorer 打开即显示 OpenClaw workspace 内容
- Agent 创建的文件在 FileExplorer 中可见
- settings 面板分为两个 section：UI 设置 / Gateway 设置

---

## Phase 2: OpenClaw 能力全面对接

**目标：** 充分复用 OpenClaw 的内置能力，减少重复建设。

### 2.1 Control UI 集成

- [ ] **O-01**: 在 Settings 中添加 "OpenClaw 控制面板" 链接（打开 `http://localhost:18789/openclaw`）
- [ ] **O-02**: 或在 Electron 中嵌入 WebView 作为内置 control UI tab
- [ ] **O-03**: 配置 `gateway.controlUi.enabled: true`，并通过 token 认证保护

### 2.2 Tool Safety 对接

- [ ] **O-04**: 对接 `tools.loopDetection` 配置（默认启用）
- [ ] **O-05**: 对接 `tools.byProvider` 限制特定 provider 的工具
- [ ] **O-06**: 对接 `tools.exec` 超时和清理配置
- [ ] **O-07**: 对接 `tools.sessions.visibility` 配置

### 2.3 内置工具 UI

- [ ] **O-08**: TTS 配置面板 — 对接 `messages.tts` 配置（provider 选择、voice 选择）
- [ ] **O-09**: TTS 播放 UI — 实现文本转语音播放
- [ ] **O-10**: Talk Mode UI — 实现语音对话界面（对接 `talk.config` 和 `talk.mode`）
- [ ] **O-11**: Browser 面板 — 对接 `browser.profiles` 配置，展示可用浏览器配置

### 2.4 增强设置面板

- [ ] **O-12**: 拆分 `SettingsView.tsx`（3119行）为子组件：
  - GeneralPanel, UsagePanel, PointsPanel, ModelsPanel, MemoryPanel, HooksPanel
  - McpPanel, SkillsPanel, SkillsMarketPanel, ImPanel, SecurityPanel
  - WorkspacePanel, GatewayPanel, PrivacyPanel, FeedbackPanel, AboutPanel
- [ ] **O-13**: 添加 SecurityPanel（展示 `openclaw security audit` 结果，安全配置）
- [ ] **O-14**: 添加 GatewayPanel（展示 Gateway 状态，端口，bind 配置，健康检查）
- [ ] **O-15**: 移除"积分"和"订阅"面板（这些是 OpenClaw 云服务功能，桌面壳不需要）

### 2.5 内置功能精简

- [ ] **O-16**: 删除或禁用 IM（Instant Messaging）频道管理 UI（SynClaw 定位桌面客户端，不是 IM 平台）
- [ ] **O-17**: 删除 `SubscriptionPanel.tsx` 和 `CreditsPanel.tsx`（OpenClaw 云服务，桌面壳不需要）
- [ ] **O-18**: 删除 `WebLoginPanel.tsx`（OpenClaw Control UI 提供更好的登录流程）
- [ ] **O-19**: 简化 Sidebar tab（Avatars / Tasks / Channels → Avatars / Tasks）

**验收标准：**
- SettingsView 拆分为独立文件，每个不超过 300 行
- Control UI 可通过内置 WebView 访问
- Security audit 结果可在 SynClaw UI 中查看

---

## Phase 3: 代码质量全面提升

**目标：** 零 TypeScript 错误，统一架构模式，提升可维护性。

### 3.1 类型安全

- [ ] **Q-01**: 从 OpenClaw 源码提取 Gateway API TypeScript 类型
- [ ] **Q-02**: 生成 `client/src/types/gateway.d.ts`，包含所有 Gateway API 请求/响应类型
- [ ] **Q-03**: 为所有 IPC handler 添加类型化的参数和返回值
- [ ] **Q-04**: 在 `client/tsconfig.json` 中启用 `strict: true`（如果尚未启用）
- [ ] **Q-05**: 统一 `AppSettings` 接口定义（只在一处定义，导出给所有消费者）

### 3.2 架构重构

- [ ] **Q-06**: 合并 `chatStore.ts` 和 `openclawStore.ts` 的 event listener 到统一的 OpenClawEventBus
  - 避免多个 store 重复注册 `window.openclaw.on()`
  - EventBus 在 React 外管理 subscription，store 只订阅关心的 event
- [ ] **Q-07**: 引入 React Context 或自定义 hook 封装 `window.openclaw` 访问
- [ ] **Q-08**: 为所有 IPC 调用添加超时和重试逻辑
- [ ] **Q-09**: 统一 gateway-bridge 的错误类型，区分：连接失败 / 认证失败 / 请求超时 / Gateway 内部错误

### 3.3 错误处理与监控

- [ ] **Q-10**: 全局错误边界（React ErrorBoundary）捕获渲染进程崩溃
- [ ] **Q-11**: 主进程异常上报（通过 electron-log 写入文件）
- [ ] **Q-12**: 关键路径添加 operation tracing（request ID 从 IPC → Gateway → response）
- [ ] **Q-13**: 添加 Playwright E2E 测试覆盖：
  - 首次引导流程
  - Chat 发送消息和响应
  - 文件操作授权
  - 设置保存和加载

### 3.4 文档

- [ ] **Q-14**: 补充 `SYSTEM_ARCHITECTURE.md` — 更新当前架构描述（IPC 通道列表、数据流图）
- [ ] **Q-15**: 补充 `SECURITY.md` — OpenClaw 安全模型、SynClaw 安全决策、CVE 响应策略
- [ ] **Q-16**: 补充架构决策记录（ADR）：
  - ADR-01: 使用 Keychain 存储认证 token
  - ADR-02: Sandbox 优先于路径白名单
  - ADR-03: electron-store vs Gateway config 职责分离
  - ADR-04: OpenClaw Capability 对接优先级

**验收标准：**
- `tsc --noEmit` 零错误，零警告
- 所有 IPC 调用有类型
- `client/e2e/app.spec.ts` 测试通过率 > 90%

---

## Phase 4: 打包与发布优化

**目标：** 完善 v1.1 发布准备工作。

### 4.1 版本管理

- [ ] **P-01**: 更新版本号到 v1.1.0
- [ ] **P-02**: 更新 `CHANGELOG.md`（记录 v1.1 的所有变更）
- [ ] **P-03**: 更新 `download-openclaw.mjs` 的版本锁定说明

### 4.2 安全发布

- [ ] **P-04**: CI 中添加 OpenClaw CVE 版本扫描
- [ ] **P-05**: CI 中添加 `openclaw security audit` 检查
- [ ] **P-06**: 代码签名配置（macOS Apple Developer ID, Windows EV Code Signing）
- [ ] **P-07**: 自动更新服务器配置（使用 electron-updater + GitHub Releases）

### 4.3 安装与首次引导

- [ ] **P-08**: 完善首次引导的 API Key 验证（实际连通性测试，不只是正则验证）
- [ ] **P-09**: 引导时展示安全配置建议（OpenClaw security audit 结果）
- [ ] **P-10**: dmg 安装后自动打开 SynClaw 并进入引导

**验收标准：**
- macOS .dmg 可在干净环境中安装并启动
- Windows .exe 安装包正常运行
- Linux AppImage 可执行

---

## 依赖关系与执行顺序

```
Phase 0 (Security + Refactor)
├── 0.1 OpenClaw 版本锁定
├── 0.2 Gateway 认证安全
├── 0.3 Sandbox 对接
└── 0.4 代码重构
    ├── R-01 拆分 ipc-handlers.ts（前置）
    ├── R-02 移除 handler 内 require（前置）
    ├── R-03 统一日志
    ├── R-04 TypeScript 类型
    ├── R-05 taskStore event 修复
    ├── R-06 settingsStore 双写修复
    ├── R-07 Google Fonts 修复
    ├── R-08 统一错误格式
    └── R-09 shell:openExternal 修复

Phase 1 (Workspace 统一)
├── 1.1 Workspace 路径统一
└── 1.2 数据流重构

Phase 2 (OpenClaw 能力对接)
├── 2.1 Control UI 集成
├── 2.2 Tool Safety
├── 2.3 内置工具 UI
├── 2.4 设置面板增强
└── 2.5 功能精简

Phase 3 (代码质量)
├── 3.1 类型安全
├── 3.2 架构重构
├── 3.3 错误处理
└── 3.4 文档

Phase 4 (打包发布)
└── 4.1-4.3 发布准备
```

---

## 成功标准

| 指标 | 目标 |
|-----|------|
| TypeScript 错误 | 0 |
| OpenClaw CVEs | 全部修复（使用 ≥ 2026.3.12） |
| IPC handler 内 require | 0 |
| ipc-handlers 单文件行数 | < 400 行 |
| SettingsView 单文件行数 | < 300 行 |
| OpenClaw Capability 对接率 | > 80%（从 < 20% 提升） |
| Security audit 检查 | 通过 |
| E2E 测试通过率 | > 90% |
| 多平台打包 | macOS .dmg / Windows .exe / Linux .AppImage |

---

## 风险与缓解

| 风险 | 缓解 |
|-----|------|
| OpenClaw 版本升级导致 API 不兼容 | 锁定版本，渐进升级，做好 API 版本检测 |
| Sandbox 引入导致性能下降 | 提供 sandbox 开关（默认开启，可关闭） |
| 拆分 ipc-handlers 影响现有功能 | 先写测试，再拆分，TDD 驱动 |
| Keychain 访问在打包后失败 | macOS Keychain entitlement 配置 + fallback 到 electron-store |
| Control UI WebView 认证问题 | 使用 Gateway token 认证 WebView URL |

---

*Last updated: 2026-03-25*

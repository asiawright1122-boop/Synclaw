# SynClaw v1.2 产品全面梳理报告

**作者：** PM 视角深度审计
**日期：** 2026-04-01
**基础：** 代码库映射（7份文档）+ v1.2 milestone archive + REQUIREMENTS.md

---

## 一、核心判断：v1.2 现状

**功能完成度：72%**（23/32 requirements satisfied，不含 gap phases 6-9）

**架构质量：优秀**
- Electron + OpenClaw Gateway 架构清晰，所有业务逻辑委托给 Gateway
- IPC handlers 领域拆分（7个模块），职责单一
- Zustand 仅管 UI 状态，无业务逻辑耦合
- 沙箱路径验证 + Sandbox 对接 + 命令注入防护
- electron-log 统一日志

**产品可用性：低**
- macOS 分发缺失（Phase 2 未完成，核心阻塞）
- 核心用户引导缺失（OnboardingView 存在但未接入启动流程）
- OpenClaw 首次运行需要手动配置（无自动化引导）
- Landing page 需要单独安装 Next.js standalone build

---

## 二、功能缺口（按用户旅程排序）

### 2.1 首次使用体验 [🔴 严重]

**问题：OnboardingView 存在但未激活**

`OnboardingView.tsx`（621行完整引导流程）存在，但在 `App.tsx` 中没有接入。用户在安装后打开应用会直接看到 ChatView（可能因为无 API key 显示错误状态）。

当前启动流程：
```
App.tsx → 检查 settingsStore.hasCompletedOnboarding
         → 如果 false → 渲染 OnboardingView
         → 设置中无 hasCompletedOnboarding 默认值检查
```

需要确认：`settingsStore.ts` 中是否有 `hasCompletedOnboarding` 的初始化逻辑？如果没有，引导流程永远不会触发。

**修复：** 确认 `hasCompletedOnboarding` 初始化为 `false`，确保首次启动触发引导。

---

### 2.2 API Key 配置体验 [🔴 严重]

**问题：用户必须在 Onboarding 中配置 API key，但配置后无验证**

`OnboardingView.tsx` L29-32：
```typescript
function validateApiKey(key: string): boolean {
  // Accept any non-empty string of sufficient length; let the Gateway validate the actual key
  return key.trim().length >= 32
}
```

仅做长度验证，不调用 Gateway 验证 key 是否有效。用户点击"完成"后，可能带着无效 key 进入 ChatView，看到通用错误。

**修复：** Onboarding Step 1 保存 API key 后，立即调用 `gateway.ping()` 或 `gateway.status()` 验证连接成功，显示明确的"连接成功/失败"状态。

---

### 2.3 Gateway 连接失败体验 [🔴 严重]

**问题：无清晰的 Gateway 断连 UI**

`GatewayPanel.tsx` 和 `ModelsPanel.tsx` 均为空（grep 搜索 `// keep empty` 确认）。

当 Gateway 连接失败时：
- 用户在 ChatView 看到通用错误（"连接中..."或空白）
- 没有专属的 Gateway 状态面板
- 没有"重试连接"按钮
- 没有引导用户检查 OpenClaw 是否运行

**修复：**
- 填充 `GatewayPanel.tsx`：显示 Gateway 状态（connected/disconnected/error）、OpenClaw 版本、连接地址
- 在 ChatView 添加专属断连 banner
- 添加"重新连接"按钮

---

### 2.4 授权目录引导 [🟡 中等]

**问题：Onboarding Step 2 授权目录选择后无验证**

`OnboardingView.tsx` L42：`const [dirError, setDirError] = useState('')`

用户可以选择任意目录，即使目录不存在或无权限，也不会阻止继续。如果用户选择了空目录或无法访问的路径，进入 ChatView 后 AI 将无法进行文件操作。

**修复：** 在"添加到授权目录"后，调用 `file.read()` 测试目录是否可读。

---

### 2.5 Landing page 集成缺失 [🟡 中等]

**问题：Landing page 需要单独构建并打包**

当前架构：
- Landing page 作为独立 Next.js 应用在 `web/` 子仓库
- 主进程通过 `spawn(process.resourcesPath/web/standalone/server.js)` 启动
- 需要 `web/` 预先构建 standalone server 并打包进 `client/resources/web/`

如果 `web/standalone/server.js` 不存在，`landingPageAvailable = false`，用户看不到关于/营销页面。

**修复：**
- 在 electron-builder 中添加 `web/` 构建步骤
- 如果未构建，提供优雅降级（显示"关于 SynClaw"信息页面而非空白）

---

### 2.6 Avatar 系统完整度 [🟡 中等]

**现状：**
- `AvatarListPanel.tsx` ✅ — 列表视图
- `AvatarEditModal.tsx` ✅ — 创建/编辑
- `AvatarSelector.tsx` ✅ — Sidebar 快速选择
- `avatarStore.ts` ✅ — 状态管理
- `avatar-templates.ts` ✅ — 5个内置模板
- E2E 测试 ✅

**缺口：**
- Avatar 技能标签（创建/编辑表单中有，但行为未定义）— R-AVA-07 已关闭为 N/A（web/ 权限系统）
- 切换 Avatar 后 ChatView 不显示当前 Avatar 名称（需要添加到 ChatView Header）
- Avatar 删除后当前会话不重置 Avatar 状态

---

### 2.7 TTS / Talk Mode 完整度 [🟡 中等]

**现状：**
- `useTTS.ts` ✅ — TTS hook
- `useSpeechRecognition.ts` ✅ — STT hook
- `VoiceModePanel.tsx` ✅ — 语音面板
- `TtsPanel.tsx` ✅ — 设置面板
- word-sync 高亮 ✅（Phase 7 新增）

**缺口：**
- TTS 提供商选择 UI 存在但可能未接入 Gateway API（`ModelsPanel.tsx` 确认有 `// keep empty`）
- 如果没有可用的 TTS 引擎，VoiceModePanel 完全隐藏（不显示任何提示）
- 移动端触控优化（R-TTS-07 标记 satisfied 但未实现）

---

### 2.8 任务系统（TaskBoard）[🟢 低]

**现状：** `TaskBoard.tsx` + `TaskDetailPanel.tsx` + `taskStore.ts` 存在

**缺口：** task event 是否接入 Gateway？需要确认 `window.openclaw.tasks.*` 是否在渲染进程中订阅了 Gateway task 事件。如果 task store 未收到事件，TaskBoard 将永远为空。

---

### 2.9 MCP 面板 [🟢 低]

**现状：** `McpPanel.tsx` 存在（设置面板中），但无实际功能

**缺口：** MCP server 配置 UI 未接入 IPC handlers。如果用户配置了 MCP server，主进程没有实际管理它的逻辑。

---

### 2.10 Skills Marketplace [🟢 低]

**现状：** `SkillsMarketPanel.tsx` + `clawhub.ts` IPC handler

**缺口：** `clawhub.ts` 依赖本地安装的 `clawhub` CLI。如果 CLI 不存在，所有操作静默失败。需要：
- 检测 CLI 是否存在，不存在时显示安装引导
- `install` / `update` / `uninstall` 操作需要 CLI，会产生异步进程

---

## 三、UX 缺口

### 3.1 Empty States（空状态引导）[🔴 严重]

**审计结果：** 大多数面板在无数据时显示空白而非引导。

| 面板 | 当前状态 | 应该显示 |
|------|---------|---------|
| `AvatarListPanel.tsx` | 空白 | 5 个模板快速创建按钮 + "创建分身" CTA |
| `TaskBoard.tsx` | 空白 | "开启你的第一个任务"引导 |
| `SkillsMarketPanel.tsx` | 空白（无引导） | ClawHub CLI 检测 + 安装引导 |
| `McpPanel.tsx` | 空白 | MCP server 添加引导 |

**修复：** 为每个有列表的面板添加 EmptyState 组件（标题 + 描述 + 主操作按钮）。

---

### 3.2 Loading States（加载状态）[🟡 中等]

**问题：** 组件内有 `isLoading` 状态，但大多数面板没有加载骨架屏（skeleton）。

- `AvatarListPanel` 列表加载时：空白 → 突然显示数据（闪烁感）
- ChatView 消息发送后：输入框消失 → 等待 AI 响应时无视觉反馈
- `FileExplorer` 加载目录时：空白

**修复：** 添加 React skeleton 组件，为每个数据加载路径添加 loading state。

---

### 3.3 Keyboard Shortcuts（快捷键）[🟡 中等]

**现状：** 仅 2 个全局快捷键
- `Cmd+Shift+C` — 新建对话
- `Cmd+Shift+K` — 打开命令面板

**建议添加：**
- `Cmd+,` — 打开设置（macOS 标准）
- `Cmd+/` — 打开快捷键参考
- `Cmd+Shift+S` — 打开侧边栏
- `Escape` — 关闭当前弹窗/面板
- `Cmd+Shift+M` — 打开语音模式

---

### 3.4 Toast / Notification 体系 [🟡 中等]

**现状：** `toastStore.ts` 存在，但 Toast 组件是否接入所有状态变更？

需要审计以下场景是否都有 Toast 反馈：
- Gateway 连接成功/失败
- API key 保存成功/失败
- 文件操作失败
- Avatar 保存成功
- TTS 播放失败
- 审批超时

---

## 四、安全缺口

### 4.1 electron-store 加密未强制 [🔴 严重]

**问题：** `STORE_ENCRYPTION_KEY` 是可选的，但 `settings.json` 中存储了：
- API key（通过 OnboardingView 配置）
- 授权目录列表
- 设备 token

如果设备被入侵（物理访问或恶意软件），所有敏感配置以明文暴露。

**当前缓解：** `app/index.ts` 中如果未设置加密 key，输出 warning log。

**修复方案（按优先级）：**
1. **高优先级：** 在 Onboarding Step 1 中引导用户设置加密 key（设置→安全性→启用加密）
2. **中优先级：** 将加密 key 作为安装时的必选项
3. **低优先级：** 敏感字段（API key）使用 macOS Keychain 存储（`keytar` 包）

---

### 4.2 Path Validation 竞态 [🟡 中等]

**问题：** `path-validation.ts` 中 `realpath()` 在文件不存在时抛出异常，导致新文件创建时路径验证失败。

**当前缓解：** 写操作跳过 realpath，使用规范化路径。

**修复：** 分离读写操作的验证逻辑。

---

### 4.3 Web Platform Token 存储 [🟡 中等]

**问题：** `web.deviceToken` 和 `web.deviceId` 存储在 electron-store 中未加密。

**影响：** 中等（device token 是设备级令牌，非用户凭证）

**修复：** 考虑使用 macOS Keychain 存储，或在 `web.ts` IPC handler 中添加加密层。

---

## 五、测试缺口

### 5.1 无单元测试 [🔴 严重]

**现状：** 0 个单元测试文件。Zustand stores、hooks、utility 函数均无测试。

**风险：** store 重构时无法保证行为一致性。

**修复：**
- 添加 Vitest（`cd client && pnpm add -D vitest`）
- 优先级1：测试 `chatStore.ts`（最核心）
- 优先级2：测试 `execApprovalStore.ts`（刚增强）
- 优先级3：测试 `useTTS.ts`

---

### 5.2 无 Chat Flow E2E [🔴 严重]

**现状：** 4 个 E2E spec（avatar、exec-approval、tts、landing-page）但无 chat spec。

**测试缺口：**
- 发送消息 → AI 响应 → 显示在 ChatView（最核心用户路径）
- API key 无效 → 错误提示
- Gateway 断连 → 提示

**修复：** 添加 `client/e2e/chat.spec.ts`，覆盖：
- 发送消息收到 AI 响应
- 发送空消息不触发请求
- 输入框 placeholder 正确

---

### 5.3 IPC Handler 无隔离测试 [🟡 中等]

**问题：** `ipc-handlers/` 下所有模块无单元测试。

**修复：** 添加 integration test，使用 `@electron-forge/test-electron` 或手动 mock IPC。

---

## 六、构建/发布缺口

### 6.1 macOS 公证（Phase 2）[🔴 严重，阻塞]

**现状：** v1.2 milestone 的唯一未完成 requirement group。

需要用户提供：
- Apple Developer ID（付费会员）
- App-specific password
- Team ID

配置到：
- `.env`（本地）
- GitHub Secrets（CI/CD）
- `electron-builder.yml` 中的 `notarize` 配置

**影响：** 用户在 macOS 上运行时会看到"此应用来自不明开发者"警告。

---

### 6.2 electron-builder.json 验证 [🟡 中等]

**问题：** CONCERNS.md 提到 `electron-builder.json` 未确认存在。

需要验证：
```bash
cat client/electron-builder.json
```

确认包含：
- macOS dmg 配置（包含 notarize）
- Windows NSIS 配置
- Linux AppImage 配置
- `appId: "com.synclaw.app"`

---

### 6.3 OpenClaw 源码下载时机 [🟡 中等]

**问题：** `openclaw-source/` 在构建时下载，未提交到 git。

**风险：** 构建时无网络 → 构建失败；npm 仓库版本变化 → 潜在 drift。

**缓解：** `package.json` 中已 pin `openclawVersion`。

**建议：** 在 CI/CD 中缓存 `node_modules/openclaw-source/` 或使用 git submodule。

---

## 七、集成缺口

### 7.1 WEB_API_BASE 必需性 [🟡 中等]

**问题：** `WEB_API_BASE` 环境变量在主进程启动时必需。

如果 web platform API 不可用（网络问题、API 服务器宕机），应用是否仍然可用？

审计 `web.ts` IPC handler 的降级策略。如果 web API 调用失败导致主进程报错，需要添加 try-catch。

---

### 7.2 ClawHub CLI 缺失处理 [🟡 中等]

**问题：** `clawhub.ts` IPC handler 依赖本地安装的 `clawhub` CLI。

如果 CLI 不存在，调用会静默失败或抛出 subprocess 错误。

**修复：** 在 handler 中检测 CLI 存在性，不存在时返回友好错误。

---

## 八、优先级矩阵

| # | 问题 | 优先级 | 影响用户 | 工作量估计 |
|---|------|--------|--------|-----------|
| P0-1 | macOS 公证（Phase 9） | 🔴 阻塞 | 所有 macOS 用户 | 2h（用户操作） |
| P0-2 | Onboarding 未接入启动流程 | 🔴 阻塞 | 所有新用户 | 0.5h |
| P1-1 | Onboarding API key 验证 | 🔴 严重 | 新用户 | 0.5h |
| P1-2 | Gateway 断连 UI | 🔴 严重 | 所有用户 | 1h |
| P1-3 | Empty states（关键面板） | 🔴 严重 | 所有用户 | 2h |
| P2-1 | electron-store 加密强制 | 🟡 中等 | 有安全需求用户 | 2h |
| P2-2 | Chat Flow E2E | 🟡 中等 | CI 质量 | 3h |
| P2-3 | Landing page 构建集成 | 🟡 中等 | 分发完整性 | 2h |
| P2-4 | Loading skeleton 统一 | 🟡 中等 | UI 质感 | 3h |
| P2-5 | Avatar 当前状态显示 | 🟡 中等 | 使用 Avatar 的用户 | 0.5h |
| P2-6 | WEB_API_BASE 降级 | 🟡 中等 | 网络受限用户 | 1h |
| P2-7 | ClawHub CLI 存在性检测 | 🟡 中等 | 使用技能的开发者用户 | 0.5h |
| P3-1 | Keyboard shortcuts 扩展 | 🟢 低 | 高级用户 | 1h |
| P3-2 | Toast 体系完整性 | 🟢 低 | 所有用户 | 1h |
| P3-3 | TaskBoard 接入 Gateway event | 🟢 低 | 使用任务的用户 | 2h |
| P3-4 | MCP Panel 接入 IPC | 🟢 低 | 使用 MCP 的开发者 | 3h |

---

## 九、建议的 v1.3 Milestone 方向

基于以上审计，建议 v1.3 聚焦 **"可用性冲刺"**：

### 方向 A：首发就绪（Recommended）
- P0 问题全部修复
- macOS 公证上线
- Onboarding 完整激活
- Gateway 状态面板
- Empty states 全面覆盖
- E2E 测试覆盖核心路径

### 方向 B：功能深化
- Avatar 技能标签 + 切换后 Header 显示
- TaskBoard 接入 Gateway task events
- MCP Panel 功能实现
- Skills marketplace 完整化

### 方向 C：质量加固
- Vitest 单元测试（stores + hooks 覆盖率 > 70%）
- Chat Flow E2E
- electron-store 加密强制
- IPC handler 集成测试

---

*PM 审计报告生成：2026-04-01*
*基于：.planning/codebase/ 下 7 份映射文档 + 代码走读*

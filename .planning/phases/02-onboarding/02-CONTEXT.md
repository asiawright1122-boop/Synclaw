# Phase 2: 首次启动引导 - Context

**Gathered:** 2026-03-24 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

用户首次启动 SynClaw 后，引导其完成 API Key 配置和授权目录选择。引导完成后不再重复显示。Gateway 可用时 UI 有明确提示。

</domain>

<decisions>
## Implementation Decisions

### 引导触发条件
- `settings.get('hasCompletedOnboarding')` 为 `true` → 跳过引导，正常渲染 App
- `hasCompletedOnboarding` 为 `false` 或不存在 → 显示引导界面
- 引导完成后调用 `settings.set('hasCompletedOnboarding', true)` 持久化

### 引导 UI 形态
- 全屏覆盖层（覆盖 App 渲染内容），不阻塞窗口
- 不使用 SettingsView modal，在 App.tsx 条件渲染 `<OnboardingView />`
- 视觉风格：暗色主题（与 globals.css 一致），CSS 变量驱动，渐变背景，Framer Motion 动画

### 引导流程（单页多步骤）
1. **Step 1: 欢迎 + API Key 配置**
   - 说明 SynClaw 使用 Claude API（用户自备 Key）
   - 输入框填写 API Key，`ANTHROPIC_API_KEY` 环境变量或 `skills.update({ apiKey })`
   - 提供"跳过"选项（使用 Gateway 默认配置）

2. **Step 2: 授权目录选择**
   - 说明授权目录的作用（AI 可操作的文件夹）
   - 调用 `window.electronAPI.dialog.selectDirectory()` 选择
   - 显示已选路径列表，支持添加/移除

3. **Step 3: 完成**
   - 确认配置，设置 `hasCompletedOnboarding = true`
   - 关闭引导层，进入主界面

### 状态持久化
- `hasCompletedOnboarding: boolean` — 写入 electron-store（通过 `settings.set` IPC）
- 授权目录列表写入 electron-store（通过 `settings.set('authorizedDirs', [...])`）

### API Key 配置方式
- 使用现有 `openclaw.skills.update({ apiKey: 'sk-...' })` API
- 先验证 Key 格式（sk-ant- 前缀），再保存

### Gateway 连接状态
- 引导第 1 步显示 Gateway 连接状态（从 `openclaw.getStatus()` 获取）
- Gateway 未就绪时禁止进入 Step 2
- 连接失败时显示错误提示和重试按钮

### 动画设计
- 步骤切换：slide + fade（Framer Motion `AnimatePresence`）
- 进度指示器：3 个圆点，当前高亮
- 按钮 hover：opacity 变化
- 所有动画与 `animationsEnabled` 设置联动

### Claude's Discretion
- 引导 UI 具体文案（按钮文本、说明文字）
- 输入框错误提示文案
- 进度条样式（已选/总数）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI 样式系统
- `client/src/renderer/styles/globals.css` — CSS 变量（主题色、圆角、阴影、动画）
- `client/src/renderer/components/Toast.tsx` — 现有组件模式（AnimatePresence、toast 通知）

### 现有 API
- `client/src/preload/index.ts` — `settings.get/set`、dialog API 签名
- `client/src/main/ipc-handlers.ts` — `settings:get/set` handler（electron-store）

### 现有模式
- `client/src/renderer/App.tsx` — 现有条件渲染模式（settingsModal）
- `client/src/renderer/stores/settingsStore.ts` — settings 持久化模式
- `client/src/renderer/lib/apiKeys.ts` — API Key 格式验证（sk-ant- 前缀）

### 产品文档
- `PRODUCT_PLAN.md` §UI 设计方向 — 毛玻璃效果、渐变背景、动画要求
- `DEVELOPMENT_GUIDELINES.md` — 架构原则

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `AnimatePresence` + motion.div（Framer Motion）— 已在 Toast.tsx 使用，可复用
- CSS 变量（`--accent-gradient`, `--bg-container`, `--text`）— 全局统一，无需重新定义
- `useToastStore` — 引导验证失败时显示 toast 通知

### Established Patterns
- 条件渲染（`settingsModalOpen ? <Settings /> : null`）— OnboardingView 同理
- Zustand store 模式：`loadSettings()` 在 useEffect 中调用
- IPC 响应处理：`res?.success && res.data` guard

### Integration Points
- `App.tsx` — 在 `loadSettings()` 后添加 `hasCompletedOnboarding` 检查
- `settingsStore.ts` — 添加 `hasCompletedOnboarding` 和 `authorizedDirs` 字段
- `ipc-handlers.ts` — 现有 settings IPC 已支持，无需新增

</codebase_context>

<deferred>
## Deferred Ideas

None — Phase 2 范围清晰。

</deferred>

---

*Phase: 02-onboarding*
*Context gathered: 2026-03-24 (auto mode)*

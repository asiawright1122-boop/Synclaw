# REQUIREMENTS.md — SynClaw v1.2 用户体验与分发完善

**Version:** v1.2
**Date:** 2026-03-30
**Status:** Near-Complete — Gap phases planned (4 phases added: 6-9)

---

## Phase 1: EXEC — Exec 审批弹窗

### 背景

OpenClaw Gateway 在执行 `exec` 操作（如运行 shell 命令）时会通过 WebSocket 发送 `exec.approval.requested` 事件，客户端需展示审批弹窗，用户确认或拒绝后调用 `exec.approval.resolve` IPC。

当前状态：`client/src/renderer/stores/chatStore.ts` 中已有 `exec.approval.requested` 事件处理，但仅有 `console.log`，无 UI。

### 功能需求

- [ ] **R-EXEC-01**: 监听 `exec.approval.requested` WebSocket 事件，显示审批弹窗
- [ ] **R-EXEC-02**: 弹窗内容：命令详情（可执行文件路径、参数、环境变量）、来源 Agent、风险提示
- [ ] **R-EXEC-03**: 支持「批准」「拒绝」「仅本次批准」三种操作
- [ ] **R-EXEC-04**: 批准后调用 `exec.approval.resolve(approvalId, { approved: true })`；拒绝后调用 `{ approved: false, reason }`
- [ ] **R-EXEC-05**: 弹窗自动超时机制（默认 5 分钟，可配置）
- [ ] **R-EXEC-06**: 多个待审批请求排队显示
- [ ] **R-EXEC-07**: 系统通知提醒有新审批请求（当 SynClaw 窗口不在前台时）

### 技术约束

- 审批弹窗使用 Framer Motion + React Portal，置于 App 根组件外层
- 审批结果通过 `window.openclaw.exec.approval.resolve()` IPC 发送
- 已批准的命令历史在设置中可查看（`exec.approvals.get` / `exec.approvals.node.get` API）
- 不在未经用户明确批准的情况下静默执行任何 shell 命令

### 验收标准

- [ ] `exec.approval.requested` 事件触发后 500ms 内显示弹窗
- [ ] 拒绝命令后 Gateway 正确终止执行（无副作用）
- [ ] 批准后命令正常执行并返回结果
- [ ] 多窗口环境下弹窗始终置顶

---

## Phase 2: SIGN — macOS 公证签名

### 背景

macOS Gatekeeper 要求应用经过 Apple 公证（notarization）才能在非开发者模式下顺利运行。当前 `electron-builder.yml` 已配置 `hardenedRuntime: true` 和 entitlements，但缺少 notarization 步骤，导致分发时用户会遇到安全警告。

### 功能需求

- [ ] **R-SIGN-01**: `electron-builder.yml` 配置 ` notarize` 参数（Apple ID、app-specific password、team ID）
- [ ] **R-SIGN-02**: `.github/workflows/release.yml` 添加 notarization step（使用 `electron-builder notarize` 或 `xcrun stapler`）
- [ ] **R-SIGN-03**: dmg 安装包签名后自动 notarize，生成含 ticket 的 .app bundle
- [ ] **R-SIGN-04**: 创建 `client/scripts/notarize.mjs` 本地公证脚本（非 CI 环境使用）
- [ ] **R-SIGN-05**: README 更新分发说明（用户需提供的 Apple Developer 凭据）
- [ ] **R-SIGN-06**: Windows / Linux 签名配置预留接口（无阻塞，仅 macOS 实现）

### 技术约束

- Apple Developer ID（付费会员）、app-specific password、Team ID 由用户提供，存入 GitHub Secrets
- `.env` 示例文件添加对应占位符注释
- `CSC_LINK` / `CSC_KEY_PASSWORD` / `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` 六个环境变量
- Notarization 失败时 CI 构建不中断，但生成警告 artifact

### 验收标准

- [ ] 构建后的 .dmg 在 macOS 13+ 全新系统上无 Gatekeeper 警告直接运行
- [ ] `xcrun stapler validate <app>.app` 返回 `The ticket is valid`
- [ ] `spctl -a -t exec -vv <app>.app` 验证通过（允许执行）
- [ ] CI 日志包含 `Transporter notarisierung succeeded`

---

## Phase 3: WEB — web/ landing page 集成

### 背景

`web/` 是独立的 Next.js 16 子仓库，已包含完整的 landing page（login、register、pricing、download 等页面）。目标是将其打包进 Electron 应用，用户可以在 SynClaw 桌面客户端内直接访问这些页面，而无需打开浏览器。

### 功能需求

- [ ] **R-WEB-01**: 实现 WebView 路由——在 SynClaw 中添加「关于/营销」入口，加载 `web/` 构建产物
- [ ] **R-WEB-02**: 技术方案选择：方案 A（本地 Next.js 服务 + BrowserView）或方案 B（独立 WebContents + 预构建静态导出）。推荐方案 A
- [ ] **R-WEB-03**: 自动检测 `web/` 子仓库是否存在，若不存在则优雅降级（隐藏入口按钮，不崩溃）
- [ ] **R-WEB-04**: web/ 与主应用之间的通信（如果需要）：通过 OpenClaw API 或 postMessage
- [ ] **R-WEB-05**: 统一样式主题——web/ 的 Tailwind 暗色主题与 Electron 客户端保持一致
- [ ] **R-WEB-06**: 在 SynClaw 主窗口中添加「关于」菜单项或 Sidebar 入口

### 技术约束

- `web/` 作为独立 git submodule 或 npm workspace 引用
- 构建时优先使用 `web/` 的 `pnpm build` 产物（`.next/` 或 `out/`）
- 不修改 `web/` 源码（独立子仓库原则）
- 若 web/ 不存在，electron-builder 构建仍然成功（graceful degradation）

### 验收标准

- [ ] SynClaw 客户端「关于」入口加载 landing page 内容，无白屏
- [ ] web/ 不存在时构建成功，入口按钮不显示
- [ ] web/ 页面与 Electron 客户端主题一致（暗色模式）
- [ ] 登录/注册页面可正常交互（表单提交、API 调用）

---

## Phase 4: TTS — TTS / Talk Mode UI

### 背景

OpenClaw Gateway 内置 TTS（文字转语音）能力，通过 `talk.*` IPC API 暴露。当前 SynClaw 客户端仅有设置面板中的 TTS 开关，缺少实际播放 UI 和对话交互界面。

### 功能需求

- [ ] **R-TTS-01**: 在 ChatView 中添加「语音模式」切换按钮（麦克风/Waveform 图标）
- [ ] **R-TTS-02**: 激活语音模式后，AI 回复实时 TTS 播放（使用 Web Audio API 或 `<audio>` 标签）
- [ ] **R-TTS-03**: TTS 播放控制：播放/暂停/停止按钮，语速调节滑块
- [ ] **R-TTS-04**: 显示当前播放文本的高亮位置（streaming TTS 同步）
- [ ] **R-TTS-05**: 语音识别输入（Speech-to-Text）——用户长按麦克风按钮说话，转文字发送给 Agent
- [ ] **R-TTS-06**: TTS 状态持久化——用户偏好在 electron-store 中保存（引擎、语速、音量）
- [ ] **R-TTS-07**: 移动端/触控优化（如果适用）

### 技术约束

- TTS 数据流：Gateway WebSocket → IPC → Renderer → Web Audio API
- 优先使用 Web Speech API（浏览器内置），无外部依赖
- WebView 模式（Phase 3）下 TTS 可能受限，需 Fallback 方案
- 不依赖任何第三方 TTS 服务（数据完全在本地处理）

### 验收标准

- [ ] 开启语音模式后，AI 回复以语音朗读
- [ ] 播放/暂停/停止功能正常
- [ ] 语音识别可将用户语音转为文字发送给 Agent
- [ ] TTS 偏好（语速、音量）重启后保持

---

## Phase 5: AVA — Avatar 多分身体系落地

### 背景

OpenClaw 支持多 Agent 分身（avatars），用户可以为不同任务创建不同性格/专业方向的 AI 分身。SynClaw 已有 Sidebar 中的 Avatars 入口 UI，但尚未对接实际的 avatars CRUD API。

### 功能需求

- [ ] **R-AVA-01**: Avatar 列表页面——展示所有分身（头像、名称、描述、默认 prompt）
- [ ] **R-AVA-02**: 创建/编辑 Avatar——名称、头像（emoji 或图片）、系统提示词、技能标签
- [ ] **R-AVA-03**: 删除 Avatar（确认对话框）
- [ ] **R-AVA-04**: 选择 Avatar 作为当前对话的 Agent（切换 active avatar）
- [ ] **R-AVA-05**: Avatar 市场/模板——预设 3-5 个官方模板（程序员、写作助手、产品经理等）
- [ ] **R-AVA-06**: Avatar 快捷切换——ChatView 输入框旁下拉选择当前分身
- [ ] **R-AVA-07**: Avatar 技能权限——不同分身可使用不同技能

### 技术约束

- 调用 OpenClaw `avatars.*` IPC API（`avatars.list`, `avatars.create`, `avatars.update`, `avatars.delete`, `avatars.activate`）
- Preload 已暴露 `window.openclaw.avatars.*` API，无需新增 IPC
- Avatar 数据存储在 OpenClaw Gateway 端（无需本地 electron-store）
- UI 组件复用现有 `client/src/renderer/components/Sidebar.tsx` 中的 Avatars 区块

### 验收标准

- [ ] 可创建、编辑、删除 Avatar
- [ ] 选择 Avatar 后，新对话使用该分身的 prompt
- [ ] 官方模板一键创建分身
- [ ] ChatView 可见当前激活的 Avatar

---

## Traceability Matrix

| REQ-ID | Phase | 描述 | 状态 |
|--------|-------|------|------|
| R-EXEC-01 | Phase 1 | 监听 exec.approval.requested，显示审批弹窗 | [x] Satisfied |
| R-EXEC-02 | Phase 1 | 弹窗内容：命令详情、环境变量、来源 Agent、风险提示 | [x] Satisfied |
| R-EXEC-03 | Phase 6 | 支持「批准」「拒绝」「仅本次批准」三种操作 | [ ] Pending (gap) |
| R-EXEC-04 | Phase 1 | 批准后调用 resolve；拒绝后调用 resolve(reason) | [x] Satisfied |
| R-EXEC-05 | Phase 1 | 弹窗自动超时机制（默认 5 分钟） | [x] Satisfied |
| R-EXEC-06 | Phase 1 | 多个待审批请求排队显示 | [x] Satisfied |
| R-EXEC-07 | Phase 1 | 系统通知提醒有新审批请求 | [x] Satisfied |
| R-SIGN-01 | Phase 9 | electron-builder.yml 配置 notarize 参数 | [ ] Pending (gap) |
| R-SIGN-02 | Phase 9 | release.yml 添加 notarization step | [ ] Pending (gap) |
| R-SIGN-03 | Phase 9 | dmg 安装包签名后自动 notarize | [ ] Pending (gap) |
| R-SIGN-04 | Phase 2 | 创建 notarize.mjs 本地公证脚本 | [x] Satisfied |
| R-SIGN-05 | Phase 9 | README 更新分发说明 | [ ] Pending (gap) |
| R-SIGN-06 | Phase 2 | Windows / Linux 签名配置预留接口 | [x] Satisfied |
| R-WEB-01 | Phase 3 | WebView 路由——「关于」入口加载 web/ | [x] Satisfied |
| R-WEB-02 | Phase 3 | Next.js standalone + BrowserView 方案 | [x] Satisfied |
| R-WEB-03 | Phase 3 | web/ 不存在时优雅降级 | [x] Satisfied |
| R-WEB-04 | Phase 8 | web/ ↔ main app 通信通过 OpenClaw API | [ ] Pending (gap) |
| R-WEB-05 | Phase 8 | 统一样式主题，暗色模式一致 | [ ] Pending (gap) |
| R-WEB-06 | Phase 3 | Sidebar 入口按钮 | [x] Satisfied |
| R-TTS-01 | Phase 4 | 在 ChatView 添加语音模式按钮 | [x] Satisfied |
| R-TTS-02 | Phase 4 | AI 回复触发 TTS 播放 | [x] Satisfied |
| R-TTS-03 | Phase 4 | TTS 播放控制：播放/暂停/停止、语速调节 | [x] Satisfied |
| R-TTS-04 | Phase 7 | 显示播放文本的高亮位置（streaming TTS 同步） | [ ] Pending (gap) |
| R-TTS-05 | Phase 4 | 语音识别输入（Speech-to-Text） | [x] Satisfied |
| R-TTS-06 | Phase 4 | TTS 状态持久化（electron-store） | [x] Satisfied |
| R-TTS-07 | Phase 4 | 移动端/触控优化 | [x] Satisfied |
| R-AVA-01 | Phase 5 | Avatar 列表页面 | [x] Satisfied |
| R-AVA-02 | Phase 5 | 创建/编辑 Avatar | [x] Satisfied |
| R-AVA-03 | Phase 5 | 删除 Avatar（确认对话框） | [x] Satisfied |
| R-AVA-04 | Phase 5 | 选择 Avatar 作为当前对话 Agent | [x] Satisfied |
| R-AVA-05 | Phase 5 | 预设 5 个官方模板 | [x] Satisfied |
| R-AVA-06 | Phase 5 | ChatView 头像选择下拉菜单 | [x] Satisfied |
| R-AVA-07 | Phase 8 | Avatar 技能权限——不同分身使用不同技能 | [ ] Pending (gap) |

**覆盖率：** 22/32 satisfied，10/32 pending（gap phases）

---

## 跨阶段约束

| 约束 | 说明 |
|------|------|
| TypeScript 零错误 | 所有新增代码通过 `tsc --noEmit` |
| 不引入新后端 | 全部逻辑委托 OpenClaw Gateway |
| 数据不离开设备 | web/ 无外部 API 调用敏感数据 |
| 构建成功 | `cd client && node scripts/build-main.mjs` 无错误 |
| 子仓库隔离 | web/ 改动不触发主仓库 CI |

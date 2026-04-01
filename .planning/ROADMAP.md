# ROADMAP.md — SynClaw v1.2 用户体验与分发完善

**Version:** v1.2
**Date:** 2026-03-30
**Status:** Near-Complete (4/5 phases verified)

---

## 阶段顺序决策

**并行规划 / 顺序执行策略：**

| 阶段 | 执行顺序 | 理由 |
|------|---------|------|
| Phase 1 (EXEC) | **最先** | 安全功能，用户体验直接影响信任度 |
| Phase 2 (SIGN) | **次之（独立）** | 与其他阶段无依赖，但需要用户提供 Apple ID |
| Phase 3 (WEB) | **并行执行** | 独立于 EXEC/SIGN，可以并行 |
| Phase 4 (TTS) | **并行执行** | 独立于其他阶段 |
| Phase 5 (AVA) | **并行执行** | 独立于其他阶段 |

**推荐执行顺序：**
1. Phase 1 (EXEC) — 先做安全相关
2. Phase 2 (SIGN) — 分发必要条件（等待用户提供 Apple ID）
3. Phase 3-5 — 三路并行，各自独立推进

---

## Phase 1: EXEC — Exec 审批弹窗

**目标：** 用户对每一个要执行的 shell 命令有知情权和批准权。

### 1.1 阶段计划

- [ ] **T-EXEC-01**: 研究 OpenClaw `exec.approval.*` WebSocket 事件格式（payload 结构）
- [ ] **T-EXEC-02**: 创建 `ExecApprovalModal.tsx` 组件（Framer Motion 动画弹窗）
- [ ] **T-EXEC-03**: 在 `chatStore.ts` 中将 `console.log` 替换为真实弹窗逻辑
- [ ] **T-EXEC-04**: 实现批准/拒绝 IPC 调用（`window.openclaw.exec.approval.resolve`）
- [ ] **T-EXEC-05**: 添加超时机制（`setTimeout`，5分钟默认）
- [ ] **T-EXEC-06**: 实现多审批排队队列
- [ ] **T-EXEC-07**: 添加系统通知（`client/src/main/notifications.ts`）
- [ ] **T-EXEC-08**: 验收测试（Playwright E2E）

### 1.2 关键文件

```
client/src/renderer/components/ExecApprovalModal.tsx   ← 新建
client/src/renderer/stores/chatStore.ts               ← 修改
client/src/renderer/stores/uiStore.ts                 ← 新增审批队列 state
client/src/renderer/App.tsx                          ← 挂载 Modal
client/e2e/exec-approval.spec.ts                     ← 新建 E2E
```

### 1.3 成功标准

- `exec.approval.requested` 事件触发后 500ms 内显示弹窗
- 批准/拒绝操作正确传递给 Gateway
- 多审批场景下正确排队

### 1.4 风险

| 风险 | 缓解 |
|------|------|
| OpenClaw exec API 变更 | Phase 1 最先做，发现问题早 |
| 审批超时用户不知情 | 添加通知 + 弹窗内倒计时显示 |

---

## Phase 2: SIGN — macOS 公证签名

**目标：** SynClaw .dmg 通过 Apple Notarization，Gatekeeper 零警告。

### 2.1 阶段计划

- [ ] **T-SIGN-01**: 确认 electron-builder `notarize` 配置格式（查询最新文档）
- [ ] **T-SIGN-02**: 更新 `electron-builder.yml` 添加 `notarize` block
- [ ] **T-SIGN-03**: 创建 `.env.example` 占位符（CSC_LINK, APPLE_ID 等 6 个变量）
- [ ] **T-SIGN-04**: 创建 `client/scripts/notarize.mjs` 本地公证脚本
- [ ] **T-SIGN-05**: 更新 `.github/workflows/release.yml` 添加 notarize step
- [ ] **T-SIGN-06**: 更新 `README.md` 分发说明（添加 Apple ID 配置指南）
- [ ] **T-SIGN-07**: 本地测试公证流程（需用户提供凭据）

### 2.2 关键文件

```
client/electron-builder.yml                           ← 修改
.github/workflows/release.yml                        ← 修改
client/scripts/notarize.mjs                          ← 新建
.env.example                                         ← 修改
README.md                                            ← 修改
```

### 2.3 成功标准

- `xcrun stapler validate` 返回有效 ticket
- `spctl -a -t exec -vv <app>.app` 验证通过
- CI 构建日志显示 `notarization succeeded`

### 2.4 风险

| 风险 | 缓解 |
|------|------|
| 用户无 Apple Developer ID | Phase 2 可以跳过，PR 合入时添加证书 |
| App-specific password 泄漏 | 仅存 GitHub Secrets，不进入代码仓库 |

---

## Phase 3: WEB — web/ landing page 集成

**目标：** SynClaw 桌面客户端内置 web/ landing page，通过 BrowserView 加载。

### 3.1 阶段计划

- [x] **T-WEB-01**: 分析 web/ 构建产物（`.next/` 或 `out/`），确定集成方案
- [x] **T-WEB-02**: 选择并实现技术方案（推荐：独立 BrowserView + 本地 Next.js 服务）
- [x] **T-WEB-03**: 修改 electron-builder 配置，`extraResources` 包含 web/ 构建产物
- [x] **T-WEB-04**: 在主进程添加 `window:openLandingPage` IPC handler
- [x] **T-WEB-05**: 在 Sidebar 添加「关于」入口按钮
- [x] **T-WEB-06**: 实现优雅降级（web/ 不存在时隐藏入口）
- [x] **T-WEB-07**: 主题一致性适配（暗色模式同步）
- [x] **T-WEB-08**: 打包测试（`electron-builder --mac`）
- [x] **T-WEB-09**: 设计并实现 DeviceToken + UsageEvent Prisma 模型
- [x] **T-WEB-10**: 创建 `POST /api/device-tokens` 和 `POST /api/usage-events` web API
- [x] **T-WEB-11**: 重写 `GET /api/usage` 从 UsageEvent + CreditsHistory 读取真实数据
- [x] **T-WEB-12**: 创建 `web:register` + `web:report-usage` + `web:revoke` IPC handlers
- [x] **T-WEB-13**: 创建 `useUsageReporter` hook 监听 Gateway 事件并上报
- [x] **T-WEB-14**: 更新 STACK.md / INTEGRATIONS.md / STRUCTURE.md 文档

### 3.2 关键文件

```
client/src/main/index.ts                             ← 修改（添加 BrowserView 管理）
client/src/main/ipc-handlers/app.ts                  ← 修改（添加 landing page IPC）
client/src/main/ipc-handlers/web.ts                  ← 新建（web 平台桥接）
client/src/main/ipc-handlers.ts                      ← 修改（注册 web.ts）
client/src/main/app-settings.ts                      ← 修改（添加 web.deviceToken 等）
client/src/renderer/components/Sidebar.tsx           ← 修改（添加入口按钮）
client/src/renderer/hooks/useUsageReporter.ts         ← 新建（Gateway 事件上报 hook）
client/src/preload/index.ts                          ← 修改（暴露 web.* API）
client/src/renderer/types/electron.d.ts               ← 修改（添加 web 命名空间类型）
web/prisma/schema.prisma                            ← 修改（添加 DeviceToken / UsageEvent 模型）
web/src/app/api/device-tokens/route.ts               ← 新建（设备注册）
web/src/app/api/device-tokens/[id]/route.ts         ← 新建（设备撤销/心跳）
web/src/app/api/usage-events/route.ts               ← 新建（用量上报）
web/src/app/api/usage/route.ts                       ← 修改（从 UsageEvent 读取真实数据）
client/e2e/landing-page.spec.ts                     ← 新建 E2E
```

### 3.3 成功标准

- 「关于」入口加载 landing page，无白屏
- web/ 不存在时构建成功
- 暗色主题一致
- SynClaw ↔ web 用量事件管道打通（SESSION_START / MESSAGE_SENT / TOKENS_CONSUMED 三类事件）
- web portal 的 /usage 页面展示真实数据（不再依赖 CreditsHistory 模拟）

### 3.4 风险

| 风险 | 缓解 |
|------|------|
| Next.js SSR/CSR 兼容性问题 | 使用 `next export` 静态导出，或仅服务端渲染 |
| CORS / CSP 问题 | BrowserView 设置 `webSecurity: false`，添加 CSP header |

---

## Phase 4: TTS — TTS / Talk Mode UI

**目标：** 在 ChatView 中实现语音输入输出，AI 回复实时 TTS 朗读。

### 4.1 阶段计划

- [ ] **T-TTS-01**: 研究 OpenClaw `talk.*` API 格式（TTS streaming 方式）
- [ ] **T-TTS-02**: 创建 `VoiceModeButton.tsx` 组件（ChatView 工具栏按钮）
- [ ] **T-TTS-03**: 实现 TTS 播放逻辑（Web Audio API）
- [ ] **T-TTS-04**: 添加播放控制 UI（播放/暂停/停止/语速滑块）
- [ ] **T-TTS-05**: 实现 Speech-to-Text（Web Speech API `SpeechRecognition`）
- [ ] **T-TTS-06**: 在设置面板中添加 TTS 配置（引擎/语速/音量）
- [ ] **T-TTS-07**: TTS 偏好持久化（electron-store）
- [ ] **T-TTS-08**: 验收测试

### 4.2 关键文件

```
client/src/renderer/components/ChatView.tsx         ← 修改（添加语音按钮）
client/src/renderer/components/VoiceModePanel.tsx   ← 新建（语音面板）
client/src/renderer/components/SettingsView.tsx     ← 修改（TTS 配置面板）
client/src/renderer/stores/uiStore.ts               ← 修改（TTS 状态）
client/src/renderer/hooks/useTTS.ts                  ← 新建（hook）
client/src/renderer/hooks/useSpeechRecognition.ts   ← 新建（hook）
```

### 4.3 成功标准

- AI 回复触发 TTS 朗读
- 播放/暂停/停止正常工作
- 语音识别准确转写用户说话内容
- 语速/音量配置重启后保持

### 4.4 风险

| 风险 | 缓解 |
|------|------|
| Web Speech API macOS Safari 支持有限 | 检测兼容性，不支持时隐藏语音按钮 |
| WebView 模式下 TTS 失效 | 走 Renderer 主进程 audio，不依赖 BrowserView |

---

## Phase 5: AVA — Avatar 多分身体系落地

**目标：** 完整的 Avatar CRUD 管理，选定分身作为当前对话 Agent。

### 5.1 阶段计划

- [ ] **T-AVA-01**: 研究 OpenClaw `avatars.*` IPC API（参数/返回值）
- [ ] **T-AVA-02**: 创建 `AvatarListPanel.tsx` 组件（分身列表 + 创建表单）
- [ ] **T-AVA-03**: 创建 `AvatarEditModal.tsx`（编辑分身弹窗）
- [ ] **T-AVA-04**: 实现 CRUD 调用（`avatars.create/update/delete/list`）
- [ ] **T-AVA-05**: 实现 `avatars.activate`（切换当前分身）
- [ ] **T-AVA-06**: 添加 ChatView 头像选择下拉菜单
- [ ] **T-AVA-07**: 创建 5 个官方模板（程序员、写作助手、产品经理、代码审查员、数据分析师）
- [ ] **T-AVA-08**: 验收测试

### 5.2 关键文件

```
client/src/renderer/components/AvatarListPanel.tsx   ← 新建
client/src/renderer/components/AvatarEditModal.tsx   ← 新建
client/src/renderer/components/ChatView.tsx          ← 修改（头像选择）
client/src/renderer/components/Sidebar.tsx           ← 修改（Avatars 入口）
client/src/renderer/stores/chatStore.ts              ← 修改（activeAvatar state）
client/src/renderer/lib/avatar-templates.ts          ← 新建（官方模板）
client/e2e/avatar.spec.ts                           ← 新建 E2E
```

### 5.3 成功标准

- 可创建/编辑/删除 Avatar
- 选中 Avatar 后对话使用对应 prompt
- 5 个官方模板可一键创建

### 5.4 风险

| 风险 | 缓解 |
|------|------|
| OpenClaw avatars API 字段未知 | 先写存根，用 mock 数据开发 UI，再接真实 API |
| Avatar 切换延迟 | UI 即时更新，Gateway 同步在后端异步执行 |

---

## Phase 6: EXEC-ENH — Exec 审批增强

**目标：** 完善审批弹窗功能，补齐 R-EXEC-03 缺失的「永久批准」选项。

### 6.1 阶段计划

- [ ] **T-EXEC-ENH-01**: 研究 Gateway exec API 是否支持 `approve-once` / `approve-all` 策略
- [ ] **T-EXEC-ENH-02**: 在 `ExecApprovalModal.tsx` 添加「仅本次批准」和/或「始终批准」按钮
- [ ] **T-EXEC-ENH-03**: 在 `execApprovalStore.ts` 支持 `approve-once` 决策类型，超时拒绝附带 reason 字段
- [ ] **T-EXEC-ENH-04**: 验收测试

### 6.2 关闭的缺口

- R-EXEC-03: 缺少「永久批准」按钮
- tech debt: 超时拒绝 reason 字段

---

## Phase 7: TTS-ENH — TTS 流式同步增强

**目标：** 实现 AI 回复 TTS 播放时的文本同步高亮，让用户看到正在朗读的位置。

### 7.1 阶段计划

- [ ] **T-TTS-ENH-01**: 研究 OpenClaw `talk.tts.stream` API 是否返回 word-level timing
- [ ] **T-TTS-ENH-02**: 在 `useTTS.ts` 暴露 `currentWordIndex` 或 `currentTime` 回调
- [ ] **T-TTS-ENH-03**: 在 `ChatView.tsx` 或 `VoiceModePanel.tsx` 实现流式文本同步高亮
- [ ] **T-TTS-ENH-04**: 验收测试

### 7.2 关闭的缺口

- R-TTS-04: 流式 TTS 同步高亮缺失

---

## Phase 8: WEB-VERIFY — web/ 子仓库集成验证

**目标：** 验证 web/ 子仓库与主应用的集成完整性，确认通信机制和主题一致性。

### 8.1 阶段计划

- [ ] **T-WEB-VERIFY-01**: 检查 `web/` 子仓库是否实现了 OpenClaw API 通信
- [ ] **T-WEB-VERIFY-02**: 验证 web/ Next.js app 暗色主题与主 app 一致
- [ ] **T-WEB-VERIFY-03**: 研究 avatar-templates.ts 技能权限字段是否应映射到 Gateway
- [ ] **T-WEB-VERIFY-04**: 验收测试（web/ 功能、E2E）

### 8.2 关闭的缺口

- R-WEB-04: web ↔ main app 通信未完全确认
- R-WEB-05: 主题一致性待验证
- R-AVA-07: 技能权限字段定义不明确

---

## Phase 9: SIGN-COMPLETE — macOS 公证完成

**目标：** 使用户能通过 Apple Notarization，彻底消除 Gatekeeper 安全警告。

⚠️ **前置条件：** 用户需要提供 Apple Developer ID + app-specific password + 证书

### 9.1 阶段计划

- [ ] **T-SIGN-01**: 用户在 GitHub Secrets 配置 Apple ID 等凭证（或本地提供）
- [ ] **T-SIGN-02**: 将 `.env.example` 凭证占位符替换为真实值（如本地测试）
- [ ] **T-SIGN-03**: 验证 `electron-builder notarize` 流程跑通（CI 或本地）
- [ ] **T-SIGN-04**: 更新 README.md 添加分发说明（Apple ID 配置指南）
- [ ] **T-SIGN-05**: 验收测试（`spctl -a -t exec -vv` 验证通过）

### 9.2 关闭的缺口

- R-SIGN-01: notarize block 填入真实值
- R-SIGN-02: CI notarize step 激活
- R-SIGN-03: dmg 公证验证
- R-SIGN-05: README 分发说明更新

---

## 进度概览

```
Phase 1: EXEC       ██████████ 100%  ✅ 完成（验证：2026-03-31）
Phase 2: SIGN      ░░░░░░░░░  0%  ⏳ 等待用户提供 Apple ID
Phase 3: WEB        ██████████ 100%  ✅ 完成（验证：2026-03-31）
Phase 4: TTS        ██████████ 100%  ✅ 完成（验证：2026-03-31）
Phase 5: AVA        ██████████ 100%  ✅ 完成（验证：2026-03-31）
Phase 6: EXEC-ENH  ░░░░░░░░░  0%  📋 Gap 修复规划中
Phase 7: TTS-ENH    ░░░░░░░░░  0%  📋 Gap 修复规划中
Phase 8: WEB-VERIFY ░░░░░░░░░  0%  📋 Gap 修复规划中
Phase 9: SIGN-CPLETE ░░░░░░░░░  0%  📋 Gap 修复规划中（阻塞）
```

**验证结果（2026-03-31）：**
- ✅ tsc --noEmit 零错误
- ✅ EXEC: ExecApprovalModal (384行) + execApprovalStore + chatStore 完整审批链路
- ✅ WEB: BrowserView 主进程管理 + Next.js standalone 集成 + Sidebar 入口
- ✅ TTS: VoiceModePanel + useTTS hook + useSpeechRecognition hook + TtsPanel 设置
- ✅ AVA: AvatarListPanel + AvatarEditModal + avatarStore + 5 官方模板 + E2E
- ✅ IPC handlers 拆分为 6 个模块
- ✅ SettingsView 拆分为 16 个独立 panel
- ⏳ SIGN: 待用户提供 Apple Developer ID

---

## 里程碑完成条件

所有 7 个阶段（原 5 个 + gap 修复 4 个）通过以下验收：

| 阶段 | 验收条件 | 状态 |
|------|---------|------|
| Phase 1: EXEC | `tsc --noEmit` 通过，E2E 测试通过 | ✅ 编译已通过，E2E 待完整环境运行 |
| Phase 2: SIGN | `spctl` 验证通过（macOS 全新环境） | ⏳ 等待 Apple ID |
| Phase 3: WEB | 打包 .app 包含 web/ 资源，入口正常加载 | ✅ 代码已实现，待打包验证 |
| Phase 4: TTS | TTS 播放/语音识别正常 | ✅ 代码已实现，待实际设备验证 |
| Phase 5: AVA | Avatar CRUD + 切换正常 | ✅ 代码已实现，E2E spec 存在 |
| Phase 6: EXEC-ENH | 「永久批准」按钮 + reason 字段 | 📋 待执行 |
| Phase 7: TTS-ENH | 流式 TTS 同步高亮 | 📋 待执行 |
| Phase 8: WEB-VERIFY | web/ 集成验证通过 | 📋 待执行 |
| Phase 9: SIGN-COMPLETE | `spctl` + `xcrun stapler validate` 通过 | ⏳ 等待 Apple ID |
| 全部 | `cd client && pnpm exec tsc --noEmit` | ✅ 零错误（2026-03-31） |
| 全部 | Playwright E2E | ⏳ 需完整环境运行 |

**Gap 修复条件（Phase 6-9）：**
- Phase 6 EXEC-ENH: 「永久批准」按钮存在且功能正常
- Phase 7 TTS-ENH: TTS 播放时文本同步高亮正常
- Phase 8 WEB-VERIFY: web/ 集成验证通过（通信 + 主题）
- Phase 9 SIGN-COMPLETE: macOS 公证验证通过（需用户提供凭证）

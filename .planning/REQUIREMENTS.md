# Requirements: SynClaw v1.3 首发就绪冲刺

**Defined:** 2026-04-01
**Core Value:** 用户可以通过自然语言对话，安全地操作用户本地文件系统，且数据永不离开用户设备。

---

## v1 Requirements

### TEST — 测试覆盖

### 背景

SynClaw 目前零单元测试、零 Chat E2E 测试。核心路径（对话交互）完全无测试覆盖，regression 风险高。

### 功能需求

- [ ] **TEST-01**: Vitest 配置完成：`vitest ^2.2` + `@testing-library/react` + `jsdom` 安装到 `client/`，配置 `vitest.config.ts`
- [ ] **TEST-02**: chatStore 单元测试覆盖：sendMessage、message 添加、MAX_MESSAGES cap、Gateway event 处理
- [ ] **TEST-03**: settingsStore 单元测试覆盖：theme 切换、hasCompletedOnboarding 持久化、跨窗口同步
- [ ] **TEST-04**: avatarStore 单元测试覆盖：activateAvatar、setActiveAvatar 同步、demo mode fallback
- [ ] **TEST-05**: execApprovalStore 单元测试覆盖：审批队列、approve/deny/approve-once 决策、timeout 逻辑
- [ ] **TEST-06**: useTTS hook 单元测试覆盖：play/stop/pause/resume、currentWordIndex 更新
- [ ] **TEST-07**: Chat E2E 测试覆盖：发送消息→AI响应→显示、空消息→不触发、无效API key→错误提示
- [ ] **TEST-08**: Playwright 配置 CI 环境适配：共享 headless 模式、Gateway mock、test timeout 调整

---

### UX — 用户体验打磨

### 背景

大部分 UI 组件已实现，但存在空状态无引导、loading 体验不统一、快捷键缺失等问题，影响用户第一印象。

### 功能需求

- [x] **UX-01**: TaskBoard 空状态引导：无任务时显示「开启你的第一个任务」标题 + 创建按钮 CTA ✅
- [x] **UX-02**: IMPanel（会话列表）空状态引导：无会话时显示「开始新对话」引导 CTA ✅
- [x] **UX-03**: AvatarListPanel 模板快速创建：无 avatar 时「一键创建」5 个内置模板按钮 ✅
- [x] **UX-04**: McpPanel 空状态引导：无 server 时显示添加引导 + 快速模板入口 ✅
- [x] **UX-05**: ChatView 加载骨架屏：AI 响应时输入区域上方显示消息骨架屏 ✅
- [x] **UX-06**: 快捷键 Cmd+,（macOS 标准）打开设置面板，替换当前的点击入口 ✅
- [x] **UX-07**: Escape 键关闭当前打开的 Modal/面板（LIFO 栈顺序）✅
- [x] **UX-08**: Cmd+Shift+S 收起/展开侧边栏 ✅
- [x] **UX-09**: Cmd+/ 打开快捷键参考页（显示所有可用快捷键）✅

---

### SECURITY — 安全加固

### 背景

electron-store 未强制加密，敏感数据（API key、授权目录）以明文存储；`WEB_API_BASE` 为必需变量，缺失时应用直接崩溃。

### 功能需求

- [ ] **SEC-01**: 设置→安全性面板：引导用户设置 `STORE_ENCRYPTION_KEY`，启用 electron-store 加密（显示警告提示当前数据未加密）
- [ ] **SEC-02**: 加密迁移：已有未加密数据的用户在启用加密后，提示并引导迁移（`settings:migrate` IPC handler）
- [ ] **SEC-03**: `web.ts` 移除模块级 throw：`WEB_API_BASE` 缺失时 `apiRequest` 返回 `{ skipped: true }`，不阻止应用启动
- [ ] **SEC-04**: `web:register` / `web:report-usage` / `web:revoke` 三个 handler 在 `WEB_API_BASE` 未配置时返回 skipped，不报错

---

### DEPLOY — 分发就绪

### 背景

v1.2 macOS 公证缺失导致用户看到「来自不明开发者」警告；Phase 9 SIGN 阻塞原因是用户需要自己配置 Apple ID，现需要提供清晰引导。

### 功能需求

- [ ] **DEPLOY-01**: 设置→关于面板：显示 macOS 签名状态（已签名/未签名/签名中）+ 未签名时显示「配置签名」按钮
- [ ] **DEPLOY-02**: README.md 更新签名配置说明：用户提供 Apple ID 后，在 `.env` 中填入 `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID`，运行 `pnpm build` 即可完成公证
- [ ] **DEPLOY-03**: `electron-builder.yml` 配置 `notarize: autoSubmit: true`，用户填入凭据后自动触发公证流程

---

## v2 Requirements

暂缓的功能。已识别但本 milestone 不实现。

### 本地 LLM

- **LLM-01**: 支持 Ollama 本地模型作为 OpenClaw AI Provider
- **LLM-02**: 模型选择 UI 支持区分云端/本地模型

### 企业功能

- **ENT-01**: 多设备同步
- **ENT-02**: 团队技能库

---

## Out of Scope

明确排除，防止范围蔓延。

| Feature | Reason |
|---------|--------|
| Keytar / macOS Keychain 集成 | v1.4+ 再做；需要 macOS entitlement 和跨平台方案 |
| 单元测试覆盖 > 80% | v1.3 只覆盖核心 5 个 store/hook；完整覆盖是质量目标 |
| 移动端触控优化 | Electron 桌面应用，触控不是主要场景 |

---

## Traceability

*(Populated during roadmap creation)*

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 10 | Pending |
| TEST-02 | Phase 10 | Pending |
| TEST-03 | Phase 10 | Pending |
| TEST-04 | Phase 10 | Pending |
| TEST-05 | Phase 10 | Pending |
| TEST-06 | Phase 10 | Pending |
| TEST-07 | Phase 11 | Done |
| TEST-08 | Phase 11 | Done |
| UX-01 | Phase 12 | Done |
| UX-02 | Phase 12 | Done |
| UX-03 | Phase 12 | Done |
| UX-04 | Phase 12 | Done |
| UX-05 | Phase 12 | Done |
| UX-06 | Phase 12 | Done |
| UX-07 | Phase 12 | Done |
| UX-08 | Phase 12 | Done |
| UX-09 | Phase 12 | Done |
| SEC-01 | Phase 13 | Pending |
| SEC-02 | Phase 13 | Pending |
| SEC-03 | Phase 13 | Pending |
| SEC-04 | Phase 13 | Pending |
| DEPLOY-01 | Phase 14 | Pending |
| DEPLOY-02 | Phase 14 | Pending |
| DEPLOY-03 | Phase 14 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after initial definition*

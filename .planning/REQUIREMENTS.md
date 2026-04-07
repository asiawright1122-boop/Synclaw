# Requirements — SynClaw v1.7 Backlog 清理 + 性能优化

> Phase 编号：26+

---

## A — Backlog 清理

### Onboarding 与连接

- [x] **ONB-01**: Onboarding API key 保存后调用 `gateway.ping()` 验证连接，显示"连接成功/失败"状态

### Gateway 状态 UI

- [x] **GATE-01**: Gateway 断连时 ChatView 显示专属断连 banner + "重新连接"按钮
- [x] **GATE-02**: GatewayPanel 显示 Gateway 状态（connected/disconnected/error）、OpenClaw 版本、连接地址

### 空状态补全

- [x] **EMPTY-01**: AvatarListPanel 无数据时显示"创建分身"CTA（已部分实现，审查补全）
- [x] **EMPTY-02**: TaskBoard 无任务时显示"开启你的第一个任务"引导
- [x] **EMPTY-03**: SkillsMarketPanel 无引导时显示 ClawHub CLI 检测 + 安装引导
- [x] **EMPTY-04**: McpPanel 无 server 时显示添加引导

### 关键 UX 补全

- [x] **UX-01**: 切换 Avatar 后 ChatView Header 显示当前 Avatar 名称
- [x] **UX-02**: Avatar 删除后当前会话重置 Avatar 状态
- [x] **UX-03**: 快捷键扩展 — 添加 Cmd+,（打开设置）、Escape（关闭弹窗）、Cmd+Shift+M（语音模式）
- [x] **UX-04**: Toast 体系完整性 — 覆盖 Gateway 连接/断连、API key 保存、Avatar 保存、TTS 播放失败、审批超时场景

### 降级与检测

- [x] **DEG-01**: WEB_API_BASE API 不可用时应用主体仍可正常使用（仅功能受限）
- [x] **CLI-01**: ClawHub CLI 不存在时 SkillsMarketPanel 显示友好安装引导（非静默失败）

---

## B — 性能优化

### 启动优化

- [x] **PERF-01**: Electron 启动链路分析 — 识别 main 进程启动瓶颈，报告耗时分布
- [x] **PERF-02**: Renderer 首次渲染优化 — 延迟加载非首屏组件，减少首屏 TTI

### IPC 优化

- [x] **PERF-03**: IPC 请求批量处理 — 对频繁轮询场景（如 gateway status）做请求去重或批量
- [x] **PERF-04**: gateway-bridge 热点方法添加缓存 — 避免重复 RPC 调用

### React 优化

- [x] **PERF-05**: Zustand store selector 审查 — 消除不必要的订阅导致的过度重渲染
- [ ] **PERF-06**: ChatView 消息列表虚拟化 — 大量消息时不卡顿

### 内存优化

- [x] **PERF-07**: 内存泄漏排查 — 使用 Chrome DevTools 排查未清理的定时器、订阅、闭包

---

## Future Requirements

以下暂不在 v1.7 范围：

- **macOS 公证** — P0，需用户提供 Apple ID
- **Keytar / macOS Keychain** — v2.0
- **Control UI WebView 集成** — v2.0
- **IM channel message history** — 独立 feature

---

## Out of Scope

| Item | Reason |
|------|--------|
| macOS 公证 | P0，需用户配合 |
| Keytar / macOS Keychain | v2.0，需更深安全架构 |
| Control UI WebView | v2.0，需设计工作 |
| IM channel message history | 不在当前 backlog |
| Local LLM (Ollama) | v2.0，需 OpenClaw 原生支持 |

---

## Traceability

| REQ-ID | Phase | Requirement | Status |
|--------|-------|-------------|--------|
| ONB-01 | Phase 26 | Onboarding API key 验证 | ✅ |
| GATE-01 | Phase 26 | Gateway 断连 banner | ✅ |
| GATE-02 | Phase 26 | GatewayPanel 状态显示 | ✅ |
| EMPTY-01 | Phase 27 | AvatarListPanel 空状态 | ✅ |
| EMPTY-02 | Phase 27 | TaskBoard 空状态 | ✅ |
| EMPTY-03 | Phase 27 | SkillsMarketPanel 空状态 | ✅ |
| EMPTY-04 | Phase 27 | McpPanel 空状态 | ✅ |
| UX-01 | Phase 28 | Avatar Header 显示 | ✅ |
| UX-02 | Phase 28 | Avatar 删除状态重置 | ✅ |
| UX-03 | Phase 28 | 快捷键扩展 | ✅ |
| UX-04 | Phase 28 | Toast 体系完整性 | ✅ |
| DEG-01 | Phase 28 | WEB_API_BASE 降级 | ✅ |
| CLI-01 | Phase 28 | ClawHub CLI 检测 | ✅ |
| PERF-01 | Phase 29 | 启动链路分析 | ✅ |
| PERF-02 | Phase 29 | 首屏渲染优化 | ✅ |
| PERF-03 | Phase 29 | IPC 批量处理 | ✅ |
| PERF-04 | Phase 29 | IPC 热点缓存 | ✅ |
| PERF-05 | Phase 30 | Zustand selector 审查 | — |
| PERF-06 | Phase 30 | ChatView 虚拟化 | — |
| PERF-07 | Phase 30 | 内存泄漏排查 | — |

---

*Requirements created: 2026-04-07 for v1.7 Backlog 清理 + 性能优化*

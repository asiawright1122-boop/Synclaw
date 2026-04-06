# Requirements — SynClaw v1.5 P2 架构与质量债

> 整理自 BACKLOG.md P2 层（2026-04-06）
> Phase 编号：20–23（延续 v1.4 Phase 19）

---

## A — TypeScript 类型安全

- [ ] **TS-01**: `gateway-bridge.ts` 中动态 `import()` 调用重构为静态 import，消除所有 `@ts-expect-error`
- [ ] **TS-02**: 所有 IPC handler 函数签名添加类型化参数和返回值（`ipc-handlers/*.ts`）
- [ ] **TS-03**: `preload/index.ts` 中 `window.openclaw` API surface 添加完整 TypeScript 接口声明

## B — EventBus 统一事件监听

- [ ] **EVT-01**: 创建统一 `EventBus` 模块，合并 chatStore 和 openclawStore 的 `window.openclaw.on()` 调用
- [ ] **EVT-02**: 创建 `useOpenClaw` React Context，封装 EventBus 订阅/取消订阅，组件卸载时自动清理
- [ ] **EVT-03**: chatStore 和 openclawStore 中的旧事件注册迁移到 EventBus API

## C — 错误处理与监控

- [ ] **ERR-01**: 顶层 App 组件添加 React ErrorBoundary，捕获渲染异常并显示友好降级 UI
- [ ] **ERR-02**: 每个 IPC 调用携带 `requestId`，日志和错误中记录 requestId，便于追踪
- [ ] **ERR-03**: 关键 RPC 调用（exec / file 操作）添加超时（10s）和重试（1 次）逻辑
- [ ] **ERR-04**: main 进程未捕获异常通过 electron-log 持久化记录

## D — Workspace 统一

- [ ] **WS-01**: IPC handler `workspace:get` 改为返回 OpenClaw Gateway 当前 workspace 路径
- [ ] **WS-02**: FileExplorer 组件改用 `workspace:get` 获取路径，移除本地 workspace 状态
- [ ] **WS-03**: electron-store 中 `workspace.path` 配置项移除（职责转移给 Gateway）

---

## Future Requirements

以下 Backlog 项目暂不在 v1.5 范围：

- **P3**: Control UI WebView 集成（OpenClaw 控制面板）
- **P3**: Keytar / macOS Keychain 集成
- **P3**: SkillsPanel 安装进度状态
- **P3**: IM 频道管理 UI 精简
- **v2.0**: Local LLM (Ollama)
- **v2.0**: 团队协作/共享技能
- **v2.0**: 企业版私有化部署

---

## Out of Scope

- **本地 LLM（Ollama）** — v2.0+，需要 OpenClaw 原生支持
- **团队协作/共享技能** — v2.0+，架构完全不同
- **企业版私有化部署** — v2.0+
- **移动端触控优化** — Electron 桌面非主要场景

---

## Traceability

| REQ-ID | Phase | Requirement | Status |
|--------|-------|-------------|--------|
| TS-01 | 20 | gateway-bridge 静态 import | ⬜ |
| TS-02 | 20 | IPC handler 类型化 | ⬜ |
| TS-03 | 20 | window.openclaw 接口声明 | ⬜ |
| EVT-01 | 21 | EventBus 模块 | ⬜ |
| EVT-02 | 21 | useOpenClaw Context | ⬜ |
| EVT-03 | 21 | 事件注册迁移 | ⬜ |
| ERR-01 | 22 | ErrorBoundary | ⬜ |
| ERR-02 | 22 | requestId 追踪 | ⬜ |
| ERR-03 | 22 | 超时 + 重试 | ⬜ |
| ERR-04 | 22 | electron-log 未捕获异常 | ⬜ |
| WS-01 | 23 | workspace:get 返回 Gateway 路径 | ⬜ |
| WS-02 | 23 | FileExplorer 使用 workspace:get | ⬜ |
| WS-03 | 23 | 移除 workspace.path 配置项 | ⬜ |

---

*Requirements created: 2026-04-06 for v1.5 P2 架构与质量债*

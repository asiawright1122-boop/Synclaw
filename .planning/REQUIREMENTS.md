# Requirements: SynClaw v1.4 安全加固冲刺

**Defined:** 2026-04-05
**Status:** ⬜ Open

---

## SEC — 协议安全 (shell:openExternal)

- [ ] **SHELL-01**: `shell:openExternal` 阻止 `javascript:` 协议（防止 URL 栏 XSS）
- [ ] **SHELL-02**: `shell:openExternal` 阻止 `data:` 协议（防止 data: URL 滥用）
- [ ] **SHELL-03**: `shell:openExternal` 仅允许 `https:` 和 `mailto:` 协议，其他全部拒绝
- [ ] **SHELL-04**: 白名单拦截后显示 toast 提示「链接被安全策略拦截」

## SBX — Sandbox 对接

- [ ] **SBX-01**: Gateway 启动时配置 `sandbox: { mode: "non-main" }`（exec 工具在子进程运行）
- [ ] **SBX-02**: 配置 `sandbox.docker.network: "none"`（沙箱内禁用网络）
- [ ] **SBX-03**: 配置 `sandbox.docker.readOnlyRoot: true`（根目录只读）
- [ ] **SBX-04**: SecurityPanel 添加 Sandbox 开关（默认开启），UI 层控制是否应用 sandbox config

## AUD — Security Audit

- [ ] **AUD-01**: 运行时调用 `openclaw security audit --json`，解析输出展示安全警告
- [ ] **AUD-02**: SecurityPanel 新增「安全审计」卡片，展示 CVE 影响评估和建议
- [ ] **AUD-03**: CI 中添加 OpenClaw 版本扫描（检查已知漏洞版本）

## FNT — Fonts 隐私

- [ ] **FNT-01**: 审计 `globals.css` 和所有组件中的 Google Fonts import
- [ ] **FNT-02**: 移除 Google Fonts CDN import，改为系统字体栈或打包字体

## NOT — macOS 公证

- [ ] **NOT-01**: macOS 公证提交（用户配置 Apple ID 后执行）
- [ ] **NOT-02**: 公证完成后验证 Gatekeeper 放行

---

## Traceability

|| REQ | Phase | Success Criterion |
|-----|------|--------------------|
| SHELL-01~04 | Phase 15 | |
| SBX-01~04 | Phase 16 | |
| AUD-01~03 | Phase 17 | |
| FNT-01~02 | Phase 18 | |
| NOT-01~02 | Phase 19 | |

---

## Future Requirements

以下为 P2/P3 范围，不在本 milestone 内：

- P2-1: TypeScript 类型安全（gateway-bridge `any` / IPC handler 类型化）
- P2-2: OpenClawEventBus 统一事件监听
- P2-3: ErrorBoundary / operation tracing
- P2-4: Workspace 统一（FileExplorer → OpenClaw workspace 路径）
- P3-1: Control UI WebView 集成
- P3-2: Keytar / macOS Keychain 集成

---

*See also: BACKLOG.md (完整 P0~P3 清单)

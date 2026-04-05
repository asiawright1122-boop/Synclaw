# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **协议白名单安全加固**: `shell:openExternal` 收紧协议控制，仅允许 `https:` 和 `mailto:`，明确拦截 `javascript:`、`data:`、`file:`、`ftp:`、`vbscript:` 等危险协议；被拦截时通过系统桌面通知告知用户，并记录结构化安全审计日志
- **OpenClaw Sandbox 对接**: `agents.defaults.sandbox` 新增 `docker.network: "none"`（沙箱内网络禁用）和 `docker.readOnlyRoot: true`（根目录只读）；SecurityPanel 新增「执行沙箱」状态卡片，联动 limitAccess 工作区隔离设置
- **Security Audit UI + CI 版本扫描**: 新增 `security:runAudit` IPC handler 调用 `openclaw security audit --json`；SecurityPanel 新增「安全审计」卡片（手动触发），支持 CVE 结果展示；CI lint job 新增 `check-openclaw-version.mjs` 版本健康检查
- **字体隐私保护**: 移除 CSP 中的 `fonts.googleapis.com` 和 `fonts.gstatic.com` CDN 权限；字体已通过 `@fontsource/inter` 本地打包，无外部请求
- **macOS 公证配置完善**: `electron-builder.yml` 新增 `notarize: tool: notarytool` 配置块；AboutPanel 签名状态说明区分「签名」与「公证」（公证在 CI 构建时完成，需配置 Apple ID）
- **Gateway Token 安全**: `fetchAuthToken` 在 token 未配置时显式抛出错误而非静默回退空字符串；移除空字符串默认值，缺失 token 时连接流程透明报错

## [1.3.0] — 2026-04-05

### Added
- **测试体系**: Vitest + @testing-library/react + jsdom 配置完成，46 个单元测试覆盖 5 个核心 stores/hooks（chatStore、settingsStore、avatarStore、execApprovalStore、useTTS）
- **Playwright E2E**: Gateway mock（CommonJS）注入，支持 CI 环境无 Gateway 运行，7 个 E2E 测试用例覆盖聊天流程、Enter 键行为、Gateway API 集成
- **空状态引导**: TaskBoard（"开启你的第一个任务"）、IMPanel（"开始新对话"）、AvatarListPanel（5 个模板快速创建）、McpPanel（快速模板入口）
- **加载骨架屏**: ChatView AI 响应期间显示 user + 2 个 assistant 气泡骨架动画
- **全局快捷键**: Cmd+,（打开设置）、Cmd+Shift+S（侧栏展开/收起）、Cmd+/（快捷键参考弹窗）、Escape（LIFO 栈顺序关闭弹窗）
- **安全面板**: electron-store STORE_ENCRYPTION_KEY 加密状态检测、密钥生成模态框、加密迁移引导
- **WEB_API_BASE 降级**: 未配置时不崩溃，web:register/report-usage/revoke handlers 返回 `{ skipped: true }`
- **签名状态检测**: Settings→About 面板通过 `codesign -d` 实时显示 macOS 签名状态（已签名/未签名/非 macOS）

### Fixed
- **OpenClaw 版本健康检查**: 启动时自动读取 package.json 验证版本 ≥ 2026.3.12（CVE GHSA-rqpp-rjj8-7wv8 补丁版本）
- **Playwright CI 启用**: 移除 `if: false` 禁用，补充 gateway-mock setupFiles，CI 完整覆盖 lint + type check + Vitest + E2E

## [1.2.0] — 2026-04-01

### Added
- **Exec 审批弹窗**: Gateway exec event → chatStore → execApprovalStore → Modal → Gateway resolve，完整链路 384 行代码
- **WEB landing page 集成**: Next.js standalone server 接入 Electron BrowserView，Sidebar "关于" 入口
- **TTS / Talk Mode UI**: VoiceModePanel + useTTS + useSpeechRecognition hooks + TtsPanel 设置页
- **Avatar 多分身体系**: AvatarListPanel + AvatarEditModal + avatarStore + 5 个内置模板 + E2E 测试
- **Exec 审批增强**: "仅本次批准" 按钮 + 超时拒绝 reason 字段
- **TTS 流式同步增强**: currentWordIndex word-sync 高亮 + ontimeupdate + VoiceModePanel 逐词渲染

### Fixed
- **WEB 集成验证**: Gateway 通信架构确认安全，主题语义一致
- **签名配置指南**: README.md 完整签名配置说明（APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID）

### Changed
- **macOS 公证**: electron-builder 配置 `notarize: autoSubmit: true`，用户自助配置 Apple ID

## [1.0.0] — 2026-03-25

### Added
- **首次发布**: SynClaw 桌面客户端
- OpenClaw Gateway 集成（本地 AI 能力）
- 首次启动引导流程（API Key + 授权目录配置）
- 文件安全白名单（路径穿越防护 + 敏感目录保护）
- 技能市场 UI（卡片浏览、分类筛选、详情抽屉、安装/卸载）
- 技能面板（启用/禁用、API Key 配置）
- 命令面板（Command Palette）技能市场入口
- electron-builder 跨平台打包配置
- GitHub Actions 自动发布 workflow
- macOS 打包支持（含 hardened runtime）
- Windows NSIS 安装包支持
- Linux AppImage 支持

### Fixed
- `openclaw-source` 路径在打包后无法正确解析（改为运行时判断）
- OpenClaw Gateway 子进程启动路径修复

### Known Issues
- macOS 代码签名需开发者证书（当前为 ad-hoc 签名）
- 首次打包需手动确认 sandbox 权限

---

*Generated for v1.0.0*

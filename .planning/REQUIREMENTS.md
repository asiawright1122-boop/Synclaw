# Requirements: SynClaw

**Defined:** 2026-03-24
**Core Value:** 用户可以通过自然语言对话，安全地操作用户本地文件系统，且数据永不离开用户设备。

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Build System

- [x] **BUILD-01**: OpenClaw 源码构建时自动编译（`dist/` 目录生成）
- [x] **BUILD-02**: Node.js 版本检查升级为 >= 22.12.0
- [x] **BUILD-03**: `file:unwatch` API 在 preload 中补充实现

### Onboarding

- [x] **ONBD-01**: 首次启动引导流程（API Key 设置）
- [x] **ONBD-02**: 授权目录选择 UI（用户指定可操作的文件路径）
- [x] **ONBD-03**: 引导状态持久化（已完成引导不再重复显示）

### File Security

- [x] **FILE-01**: 文件操作路径白名单验证（防止路径穿越攻击）
- [x] **FILE-02**: 敏感目录保护（禁止访问系统目录）
- [x] **FILE-03**: 授权目录动态管理（在设置中添加/移除授权路径）

### Skill Market

- [ ] **SKIL-01**: 技能市场 UI（卡片式布局、分类筛选、搜索）
- [ ] **SKIL-02**: 技能一键安装（调用 ClawHub API）
- [ ] **SKIL-03**: 技能详情页（描述、配置项、使用统计）

### Packaging

- [ ] **PACK-01**: macOS .dmg 安装包（含签名）输出到 `release/`
- [ ] **PACK-02**: Windows .exe 安装包输出到 `release/`
- [ ] **PACK-03**: Linux AppImage 输出到 `release/`
- [ ] **PACK-04**: CI/CD 自动发布（GitHub Actions release workflow）

## v2 Requirements

### Advanced File Operations

- **FILE-04**: 批量文件操作（批量重命名、移动）
- **FILE-05**: 文件操作历史记录和撤销
- **FILE-06**: 拖拽交互支持

### Skill System

- **SKIL-04**: 团队共享技能库
- **SKIL-05**: 技能自定义配置面板
- **SKIL-06**: 技能使用统计

### IM Channels

- **IMCH-01**: 飞书渠道接入
- **IMCH-02**: 企业微信渠道接入

### Collaboration

- **COLL-01**: 多设备同步
- **COLL-02**: 团队协作和权限管理

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 本地 LLM（Ollama）支持 | v2.0+；需要额外架构设计 |
| 团队协作/共享技能 | v2.0+；MVP 聚焦单人体验 |
| 企业版私有化部署 | v2.0+；超出 MVP 范围 |
| 视频/音频生成 | v1.0 聚焦文件操作核心 |
| Web 端 | 桌面客户端定位 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 1 | Complete |
| BUILD-02 | Phase 1 | Complete |
| BUILD-03 | Phase 1 | Complete |
| ONBD-01 | Phase 2 | Complete |
| ONBD-02 | Phase 2 | Complete |
| ONBD-03 | Phase 2 | Complete |
| FILE-01 | Phase 3 | Complete |
| FILE-02 | Phase 3 | Complete |
| FILE-03 | Phase 3 | Complete |
| SKIL-01 | Phase 4 | Pending |
| SKIL-02 | Phase 4 | Pending |
| SKIL-03 | Phase 4 | Pending |
| PACK-01 | Phase 5 | Pending |
| PACK-02 | Phase 5 | Pending |
| PACK-03 | Phase 5 | Pending |
| PACK-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---

*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after GSD initialization*

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

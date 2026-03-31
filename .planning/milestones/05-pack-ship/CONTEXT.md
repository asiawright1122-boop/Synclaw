# Phase 5: 打包发布

## 阶段目标
将 SynClaw 桌面客户端打包为可发布的 .dmg / .exe 安装包。

## 前置条件
- [x] Phase 1: 构建修复完成
- [x] Phase 2: 首次引导完成
- [x] Phase 3: 文件安全完成
- [x] Phase 4: 技能市场 UI 完成
- [ ] Phase 5: 打包发布

## 已知事项
- electron-builder 配置存在于 `client/electron-builder.yml`
- `client/scripts/build-main.mjs` 已完成主进程构建脚本
- `client/release/` 中已有之前的发布产物

## 待探索
- macOS 代码签名（entitlements、签名证书）
- Windows NSIS 配置
- GitHub Actions release workflow
- 自动更新机制（electron-updater 已集成在 `updater.ts`）

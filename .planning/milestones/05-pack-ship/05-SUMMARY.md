# Phase 5: 打包发布 — 执行摘要

**Phase:** 5
**Completed:** 2026-03-25
**Requirements addressed:** PACK-01, PACK-02, PACK-03, PACK-04

---

## 做了什么

### 关键 Bug 修复：`openclaw-source` 打包后路径问题

**问题**：`dist/main/index.js` 中硬编码了开发绝对路径 `/Users/kaka/Desktop/synclaw/client/resources/openclaw-source`，打包后 app 无法运行。

**修复**：
- `gateway-bridge.ts`：删除构建时占位符注入，改为与 `openclaw.ts` 一致的运行时 `app.isPackaged` 路径判断
- `build-main.mjs`：移除无用的源文件注入逻辑，不再需要临时文件
- 删除：`dist/_gateway-bridge-injected.mjs`（旧注入产物）

### electron-builder 配置完善

- 添加 `electronDist: node_modules/electron/dist`（避免 CI 访问 ~/Library/Caches/electron）
- `extraResources` filter 排除 `.git/**/*` 和 `**/.vscode/**/*`（防止扩展属性冲突）
- `output: release/latest` 避免旧 release 残留覆盖问题

### GitHub Actions release workflow 完善

原 workflow 三平台并行构建但未创建 Release。重构为：
- 三平台并行 build job（macOS / Windows / Linux）
- `create-release` job 依赖所有 build，合并 artifacts
- `softprops/action-gh-release@v2` 自动创建 Draft Release 并附加所有平台安装包
- `generate_release_notes: true` 自动生成 changelog

### CHANGELOG.md

创建项目级 CHANGELOG.md，记录 v1.0.0 所有变更（Added / Fixed / Known Issues）。

---

## 验证结果

| 检查项 | 结果 |
|--------|------|
| TypeScript 零错误 | ✅ |
| Main 进程重新构建成功 | ✅ |
| asar 包含完整 dist + preload + 依赖 | ✅ |
| openclaw-source 打包正确，.git/.vscode 已排除 | ✅ |
| ZIP 产物生成 (11.5 MB) | ✅ |
| DMG（sandbox 限制，CI 可正常生成） | ⚠️ CI 验证 |
| GitHub Actions workflow 结构正确 | ✅ |

---

## 修改的文件

- `client/src/main/gateway-bridge.ts` — 路径注入修复
- `client/scripts/build-main.mjs` — 清理注入逻辑
- `client/electron-builder.yml` — electronDist + filter 完善
- `client/package.json` — electron:build:mac 加 `--publish never`
- `.github/workflows/release.yml` — 重构为并行构建 + Release 创建
- `CHANGELOG.md` — 新建

---

## 已知限制

- **macOS DMG**：sandbox 阻止 `hdiutil` 创建 APFS 卷，本地无法验证 DMG；CI（GitHub Actions macOS runner）无此限制
- **macOS 代码签名**：无 Developer ID 证书，仅 ad-hoc 签名；真实分发需配置签名证书
- **Windows/Linux**：CI runner 上验证

---

## 发布步骤

```bash
# 1. 打 tag 触发 CI
git tag v1.0.0
git push origin v1.0.0

# 2. CI 自动完成：构建 → 创建 Draft Release
# 3. 在 GitHub Releases 页面审核 Draft Release，确认后点击 Publish
```

---

*Summary created: 2026-03-25*

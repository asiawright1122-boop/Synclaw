# Phase 5: 打包发布 — 执行计划

---
**Phase:** 5
**Created:** 2026-03-25
**Status:** Ready for execution
**Requirements addressed:** PACK-01, PACK-02, PACK-03, PACK-04

---

## Context

### 已具备的条件

| 资源 | 状态 | 路径 |
|------|------|------|
| electron-builder.yml | 完整，多平台配置 | `client/electron-builder.yml` |
| macOS 图标 (.icns) | 合法 (379KB) | `client/build/SynClaw.icns` |
| Windows 图标 (.ico) | 合法 (4 icons, 48x48/32x32) | `client/build/icon.ico` |
| macOS entitlements | 已配置 | `client/build/entitlements.mac.plist` |
| Linux icons | 已生成 | `client/build/icons/` |
| dist/main/index.js | 已构建 | `client/dist/main/` |
| dist/preload/index.cjs | 已构建 | `client/dist/preload/` |
| openclaw-source | 已同步 | `client/resources/openclaw-source/` |
| GitHub release workflow | 已存在（需完善） | `.github/workflows/release.yml` |
| 已打包的 SynClaw.app | 存在（macOS） | `client/release/mac-arm64/` |

### 需要验证/修复的问题

1. **`electron-builder.yml` files 数组**：`"!node_modules/**/*"` 排除所有依赖，但 electron-builder 对 asar 打包会按 `extraMetadata` + `files` 精确控制。建议改为更明确的包含列表，避免隐式依赖缺失。
2. **`resources/openclaw-source` 路径注入**：构建时 `build-main.mjs` 注入的路径是 `path.resolve(ROOT, 'resources', 'openclaw-source')`（开发路径），但在 asar 打包后实际路径是 `process.resourcesPath + '/openclaw-source'`。需要确认 `gateway-bridge.ts` 在打包后能正确找到。
3. **Release workflow 问题**：
   - `npm run build` 会执行 `vite build && node scripts/build-main.mjs`，但 main process 需要先有 openclaw-source，所以顺序正确
   - 未配置 GitHub Release 自动创建（artifact 上传后需手动创建 release）
   - macOS 打包无签名（developer ID 证书），可生成临时 dmg 但无法在真实分发
4. **version 注入**：需要确认 `package.json` 的 version 是否在 CI 中自动更新

---

## Plans

### Plan 01: 验证并修复 electron-builder 配置

**Objective:** 确保打包配置正确，asar 包含所有必要文件，openclaw-source 路径在打包后可用。

**Requirements addressed:** PACK-01, PACK-02, PACK-03

```yaml
---
objective: 验证 electron-builder.yml 配置并修复发现的问题
depends_on: []
wave: 1
autonomous: false
files_modified:
  - client/electron-builder.yml
  - client/src/main/gateway-bridge.ts
requirements:
  - PACK-01
  - PACK-02
  - PACK-03
---
```

**Tasks:**

1. **审计 electron-builder.yml files 配置**
   - 读取 `client/electron-builder.yml` 完整内容
   - 检查 `"!node_modules/**/*"` 是否会导致 asar 缺失运行时必需依赖
   - 确认 `electron-store` / `ws` / `framer-motion` 等是否通过 asar 正常包含
   - 验证：检查已打包 app.asar 中是否存在 `electron-store`、`ws` 等关键模块

2. **验证 openclaw-source 路径（asar 兼容性）**
   - 读取 `client/src/main/gateway-bridge.ts`，找到 `__OPENCLAW_SOURCE_PLACEHOLDER__` 注入位置
   - 在构建后检查 dist/main/index.js 中注入的路径是绝对路径还是相对路径
   - 如果是绝对开发路径（`/Users/.../resources/openclaw-source`），需改为使用 `process.resourcesPath` 的运行时路径
   - 修复方式：在 `build-main.mjs` 注入时使用占位符（如 `__RESOURCES_PATH_PLACEHOLDER__`），运行时替换

3. **精简 files 配置**
   - 改为只显式包含必要文件，减少 asar 大小和潜在问题
   - 包含：dist/**, package.json, public/**, node_modules/electron-store/**, node_modules/conf/**, node_modules/env-paths/** 等关键依赖
   - 可选：添加 .gitignore 风格的规则排除测试文件

**Acceptance Criteria:**
- app.asar 中包含所有必需模块（electron-store, ws, framer-motion 等）
- openclaw-source 在打包后能被正确找到（无论开发还是生产路径）
- electron-builder 配置文件符合最佳实践

**Verify:**
```bash
# 检查 asar 内容
npx asar list client/release/mac-arm64/SynClaw.app/Contents/Resources/app.asar | head -30
npx asar list client/release/mac-arm64/SynClaw.app/Contents/Resources/app.asar | grep electron-store
```

---

### Plan 02: 验证本地 macOS 打包成功

**Objective:** 在本地执行完整打包流程，验证无错误产出 .dmg 文件。

**Requirements addressed:** PACK-01

```yaml
---
objective: 本地执行完整打包流程，验证 macOS .dmg 产出
depends_on:
  - "01"
wave: 2
autonomous: false
files_modified: []
requirements:
  - PACK-01
---
```

**Tasks:**

1. **执行完整构建**
   ```bash
   cd client
   pnpm run electron:build:mac
   ```
   - 预期：生成 `release/SynClaw-*.dmg`
   - 如果失败，记录错误并回到 Plan 01 修复

2. **验证产出文件**
   - 确认 `.dmg` 文件存在
   - 确认 `.dmg` 大小合理（> 100MB）
   - 确认 `release/` 目录中包含 blockmap 文件（用于自动更新）

3. **可选：验证 dmg 可挂载**
   - 用 hdiutil 挂载 dmg 验证内容完整性（不实际安装 app）

**Acceptance Criteria:**
- `pnpm run electron:build:mac` 执行成功，无 error
- `release/SynClaw-*-arm64.dmg` 存在且大小 > 100MB

**Verify:**
```bash
ls -lh client/release/*.dmg
```

---

### Plan 03: 完善 GitHub Actions release workflow

**Objective:** 让 release workflow 能够自动创建 GitHub Release 并附加所有平台的安装包。

**Requirements addressed:** PACK-04

```yaml
---
objective: 完善 release workflow，实现自动创建 GitHub Release + 上传 artifacts
depends_on:
  - "02"
wave: 3
autonomous: false
files_modified:
  - .github/workflows/release.yml
requirements:
  - PACK-04
---
```

**Tasks:**

1. **读取并分析现有 release.yml**
   - 确认现有 workflow 结构（已有三平台并行构建 + artifact 上传）
   - 识别缺失部分：未创建 GitHub Release、未上传 assets

2. **增强 release.yml：创建 Release + 上传 Assets**
   - 添加 `softprops/action-gh-release@v2` 步骤（仅 macOS job 执行）
   - 配置 `generate_release_notes: true`
   - 在每个平台的 artifact upload 后，添加 download + attach 步骤
   - 或：在所有 build 完成后统一创建 release（需要合并 artifacts）

3. **改进构建步骤**
   - 添加 `pnpm run electron:build:mac` 使用的 `--publish never`（避免开发时误发布）
   - release workflow 中使用 `--publish always` 或不上传（softprops/action-gh-release 处理）
   - 确保 Windows artifact 正确命名（`${productName}-${version}-${arch}.${ext}`）

4. **处理 macOS 代码签名（如需要）**
   - 如果有 AD_HOC_SIGNING_IDENTITY（`-"`），添加到 Keychain
   - 如无签名能力，保留 --no-sign 注释说明

5. **配置版本号来源**
   - 确保 `package.json` 的 version 作为唯一真相来源
   - workflow 中无需额外 version 处理（已有 `extraMetadata.main`）

**Acceptance Criteria:**
- push tag `v*` 触发 workflow 后，自动创建 GitHub Release
- Release 包含 macOS .dmg、可能 Windows .exe、Linux .AppImage 作为 assets
- Release notes 自动生成（基于 commit 历史）

**Verify:**
- 检查 `.github/workflows/release.yml` 包含 `softprops/action-gh-release`
- 检查 artifact 正确上传和关联

---

## Verification

### Build Verification

```bash
# 1. TypeScript 检查
cd client && pnpm exec tsc --noEmit

# 2. Renderer 构建
cd client && pnpm run build:renderer

# 3. Main 进程构建
cd client && node scripts/build-main.mjs

# 4. 完整打包（macOS）
cd client && pnpm run electron:build:mac
```

### Functional Verification

1. `.dmg` 文件生成并可挂载
2. `openclaw-source` 在 app bundle 中存在且路径正确
3. GitHub Actions release workflow 可从 tag 触发并上传 assets

---

## Dependencies & Waves

- **Wave 1:** Plan 01（electron-builder 配置审计与修复）
- **Wave 2:** Plan 02（本地 macOS 打包验证，依赖 Wave 1）
- **Wave 3:** Plan 03（GitHub Actions release workflow 完善，依赖 Wave 2）

---

## must_haves (Goal-Backward Verification)

| Criterion | Source |
|-----------|--------|
| macOS .dmg 文件生成，输出到 release/ | PACK-01 |
| Windows .exe 安装包输出到 release/ | PACK-02 |
| Linux AppImage 输出到 release/ | PACK-03 |
| GitHub Actions release workflow 可从 tag 自动触发构建并发布 | PACK-04 |
| release/ 目录包含所有平台安装包 | Phase 5 Success Criteria |
| GitHub Releases 页面包含版本说明和下载链接 | Phase 5 Success Criteria |

---

*Plans: 3 | Waves: 3 | Created: 2026-03-25*

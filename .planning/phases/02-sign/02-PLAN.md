# Phase 2: SIGN — macOS 公证签名 — 执行计划

**Phase:** 2
**Created:** 2026-03-31
**Status:** Blocked — waiting for user credentials

---

## Context

Phase 2 配置 electron-builder notarization，使 SynClaw .dmg 通过 Apple Notarization，Gatekeeper 零警告。

当前状态：配置占位符已就绪，缺少用户凭证。

---

## Plans

### Plan 01: macOS 公证签名配置

**Objective:** 配置完整的 notarization 流程。

```yaml
---
objective: 完成 macOS 公证签名配置，用户凭证到位后一键执行
depends_on: []
wave: 1
autonomous: false
files_modified:
  - client/electron-builder.yml
  - .github/workflows/release.yml
  - client/scripts/notarize.mjs
  - .env.example
requirements:
  - SIGN-01 ~ SIGN-07
---
```

**Tasks (用户凭证到位后执行):**

1. **验证 electron-builder notarytool 配置**
   - 确认 `notarize: { tool: 'notarytool' }` 配置格式
   - 配置 `appleId`, `appleIdPassword`, `teamId`

2. **本地测试公证**
   - 在 macOS 设备上运行 `node scripts/notarize.mjs`
   - 验证 `xcrun stapler validate` 返回有效 ticket

3. **验证 CI 公证流程**
   - push tag 触发 CI
   - 检查日志中 `notarization succeeded`

**Acceptance Criteria:**
- `xcrun stapler validate SynClaw.app` 返回有效 ticket
- `spctl -a -t exec -vv SynClaw.app` 验证通过
- CI 构建日志显示 `notarization succeeded`

**Verify:**
```bash
# 本地（macOS）
xcrun stapler validate SynClaw.app
spctl -a -t exec -vv SynClaw.app

# CI
gh run list --workflow=release.yml --status=completed
gh run view <run-id> --log
```

---

## Verification

### Prerequisites
- Apple Developer ID
- App-specific password
- Developer certificate (.p12)

### Code Review
- `client/electron-builder.yml` — notarize block 配置完整
- `.github/workflows/release.yml` — notarize step 已添加
- `client/scripts/notarize.mjs` — 本地公证脚本存在

---

## must_haves

| Criterion | Source |
|-----------|--------|
| `xcrun stapler validate` 返回有效 ticket | SIGN-07 |
| `spctl` 验证通过 | SIGN-07 |
| CI 日志显示 `notarization succeeded` | SIGN-07 |
| GitHub Release 包含已公证的 .dmg | SIGN-04 |

---

## Blocker

**需要用户提供以下信息：**
- Apple ID 邮箱
- App-specific password（Apple 账号 → 安全 → 专用 App 密码）
- Developer certificate（.p12 文件）
- 证书密码

---

*Plans: 1 | Waves: 1 | Created: 2026-03-31*

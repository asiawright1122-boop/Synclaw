# Phase 2: SIGN — macOS 公证签名 — Context

**Gathered:** 2026-03-31
**Status:** Blocked — waiting for user

---

## Phase Boundary

配置 electron-builder notarization 脚本，使 SynClaw .dmg 通过 Apple Notarization，Gatekeeper 零警告。

---

## Implementation Status

### 已实现（配置占位符）

- `electron-builder.yml` — `notarize` block 已配置（占位符）
- `.github/workflows/release.yml` — `notarize` step 已添加
- `.env.example` — CSC_LINK, APPLE_ID 等 6 个变量占位符
- `client/scripts/notarize.mjs` — 本地公证脚本

### 缺失（需用户提供）

- `APPLE_ID` — Apple 账号邮箱
- `APPLE_ID_PASSWORD` — App-specific password
- `CSC_LINK` — Developer certificate（.p12 或 .cer）
- `CSC_KEY_PASSWORD` — 证书密码

---

## Canonical References

- `client/electron-builder.yml` — notarize block
- `.github/workflows/release.yml` — release workflow
- `client/scripts/notarize.mjs` — local notarize script
- `.env.example` — environment variables

---

## Blocker

| 缺失项 | 提供者 |
|--------|--------|
| Apple Developer ID（账号邮箱） | 用户 |
| App-specific password | 用户 |
| Developer certificate（.p12/.cer） | 用户 |
| 证书密码 | 用户 |

---

## Next Steps

用户提供以上 4 项后，运行：
```bash
# 1. 配置 GitHub Secrets
gh secret set APPLE_ID --body "your@email.com"
gh secret set APPLE_ID_PASSWORD --body "xxxx-xxxx-xxxx-xxxx"
gh secret set CSC_LINK --body "$(cat certificate.p12 | base64)"
gh secret set CSC_KEY_PASSWORD --body "cert-password"

# 2. 测试本地公证
cd client && node scripts/notarize.mjs
```

---

*Context gathered: 2026-03-31*

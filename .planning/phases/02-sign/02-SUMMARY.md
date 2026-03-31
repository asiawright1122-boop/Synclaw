# Phase 2: SIGN — 执行摘要

**Phase:** 2
**Status:** Blocked — waiting for user credentials

---

## 已完成

- `electron-builder.yml` — `notarize` block 配置占位符
- `.github/workflows/release.yml` — `notarize` step 已添加
- `.env.example` — CSC_LINK, APPLE_ID, APPLE_ID_PASSWORD, CSC_KEY_PASSWORD, TEAM_ID 占位符
- `client/scripts/notarize.mjs` — 本地公证脚本

---

## 阻塞项

| 缺失项 | 来源 |
|--------|------|
| Apple Developer ID（邮箱） | 用户提供 |
| App-specific password | 用户提供（Apple 账号 → 安全 → 专用 App 密码） |
| Developer certificate（.p12） | 用户提供 |
| 证书密码 | 用户提供 |

---

## 下一步

用户提供凭证后，运行：
```bash
# GitHub Secrets
gh secret set APPLE_ID --body "your@email.com"
gh secret set APPLE_ID_PASSWORD --body "xxxx-xxxx-xxxx-xxxx"
gh secret set CSC_LINK --body "$(cat cert.p12 | base64)"
gh secret set CSC_KEY_PASSWORD --body "password"
gh secret set TEAM_ID --body "XXXXXXXXXX"

# 本地测试
cd client && node scripts/notarize.mjs
```

---

*Status: Blocked — 2026-03-31*

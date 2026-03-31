# Phase 1: 构建修复 - Plans

**Created:** 2026-03-24
**Wave:** 1 (sequential — single task)

---

## 01 - Node.js 版本检查修复

**Objective:** 修复 `build-main.mjs` 中 Node.js 版本检查，使错误信息与 OpenClaw Gateway 实际要求一致。

**Requirements addressed:** BUILD-02

**Wave:** 1

**Files modified:**
- `client/scripts/build-main.mjs`

---

```yaml
---
objective: 修复 Node.js 版本检查从 >=20 升级至 >=22.12.0
depends_on: []
autonomous: false
---

<read_first>
client/scripts/build-main.mjs
</read_first>

<acceptance_criteria>
- grep "22.12.0" client/scripts/build-main.mjs | grep -q "checkNodeVersion"
- grep "major < 22" client/scripts/build-main.mjs | grep -q "checkNodeVersion"
- grep "22.12.0" client/scripts/build-main.mjs | grep -q "error"
</acceptance_criteria>

<action>
修改 client/scripts/build-main.mjs 中的 checkNodeVersion() 函数：

将第 19-21 行的版本判断：
  if (major < 20) {
    console.error(`Node.js 20+ required, got ${version}`)

修改为：
  if (major < 22 || (major === 22 && minor < 12)) {
    console.error(`Node.js 22.12.0+ required, got ${version}`)

具体修改：
1. 在函数开头解析 minor 版本：const [, minor = 0] = version.split('.').map(Number)
2. 将判断条件从 major < 20 改为 (major < 22 || (major === 22 && minor < 12))
3. 错误信息从 "Node.js 20+ required" 改为 "Node.js 22.12.0+ required"
</action>
```

---

## Verification

完成上述修改后，验证以下条件：

1. `cd client && node scripts/build-main.mjs` — 应输出 `Node.js XX` 并正常完成构建
2. `cd client && pnpm exec tsc --noEmit` — TypeScript 编译零错误
3. `grep "22.12.0" client/scripts/build-main.mjs` — 确认版本要求已更新

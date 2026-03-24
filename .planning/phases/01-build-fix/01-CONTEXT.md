# Phase 1: 构建修复 - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

修复 Electron 客户端的构建问题，确保 `pnpm run electron:dev` 可以正常启动并运行。

已知问题（基于代码审查）：
- Node.js 版本检查只要求 >= 20，但 OpenClaw Gateway 需要 >= 22.12.0
- `openclaw-source/dist/` 已存在于 npm 下载包中（不是问题）
- `file:unwatch` API 已在 preload 和 ipc-handlers 中实现（已修复）
- `build-main.mjs` 路径指向 `resources/openclaw-source`（实际在 `client/resources/openclaw-source`）

</domain>

<decisions>
## Implementation Decisions

### Node.js 版本检查
- 升级 `build-main.mjs` 中 `checkNodeVersion()` 从 Node.js 20 → **Node.js 22.12.0**
- 错误信息更新为 `Node.js 22.12.0+ required`

### OpenClaw 源码路径
- `build-main.mjs` 中 `openclawSourcePath` 指向 `resources/openclaw-source`，但实际位置是 `client/resources/openclaw-source`
- 需要修正路径引用

### 其他检查项
- TypeScript 编译检查：`cd client && pnpm exec tsc --noEmit`
- 主进程构建验证：`cd client && node scripts/build-main.mjs`
- Electron 开发模式验证：`cd client && pnpm run electron:dev`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build system
- `client/scripts/build-main.mjs` — 构建脚本，需要修改 Node.js 版本检查和路径
- `client/scripts/download-openclaw.mjs` — OpenClaw 下载脚本
- `client/src/main/gateway-bridge.ts` — Gateway 桥接层，验证构建依赖

### Existing code
- `client/src/preload/index.ts` — Preload API（file:unwatch 已实现）
- `client/src/main/ipc-handlers.ts` — IPC Handlers（file:unwatch 已实现）

### Documentation
- `PRODUCT_PLAN.md` §Tech Stack — Node.js >= 20 要求
- `DEVELOPMENT_GUIDELINES.md` — 开发准则

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `build-main.mjs` 的 `checkNodeVersion()` 函数可直接修改条件
- `ensureDistDirs()`, `buildMainProcess()`, `buildPreload()` 函数结构清晰，可直接扩展

### Established Patterns
- 构建脚本使用 esbuild，输出到 `dist/main/index.js`
- Node.js 版本检查使用 semver 主版本号比较

### Integration Points
- `build-main.mjs` 修改后应自动被 `pnpm run build` 和 `pnpm run electron:dev` 调用

</codebase_context>

<deferred>
## Deferred Ideas

None — Phase 1 范围清晰，无需讨论。

</deferred>

---

*Phase: 01-build-fix*
*Context gathered: 2026-03-24*

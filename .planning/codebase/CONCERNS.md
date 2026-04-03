# Codebase Concerns

**Analysis Date:** 2026-04-03

## Tech Debt

**Mock channel storage (in-memory, non-persistent):**
- Issue: `mockChannels` is a process-local object used as the only channel store.
- Files: `web/src/app/api/channels/route.ts`
- Impact: channel data is lost on restart and inconsistent across instances; no real IM integrations.
- Fix approach: add a `Channel` model in the DB, persist per-user channels, and integrate real IM SDKs.

**In-memory rate limiters used in production code paths:**
- Issue: rate limiters use `Map` in process memory and reset on restart.
- Files: `web/src/lib/auth.ts`, `web/src/app/api/credits/deduct/route.ts`, `client/src/main/ipc-handlers/web.ts`
- Impact: rate limiting is ineffective across multiple instances and can be bypassed after restarts.
- Fix approach: move to centralized rate limiting (Redis/Upstash) with per-user or per-device keys.

## Known Bugs

**`shell:showItemInFolder` IPC validation is never awaited:**
- Symptoms: `shell:showItemInFolder` returns `success: false` and never opens the folder.
- Files: `client/src/main/ipc-handlers/shell.ts`
- Trigger: any call to `shell:showItemInFolder` from the renderer.
- Workaround: none (requires code fix to `await validatePath(...)`).

## Security Considerations

**Sensitive settings stored unencrypted when `STORE_ENCRYPTION_KEY` is unset:**
- Risk: authorized directories and device tokens can be persisted in plaintext.
- Files: `client/src/main/index.ts`, `client/src/main/app-settings.ts`, `client/src/main/ipc-handlers/web.ts`
- Current mitigation: warning log only.
- Recommendations: require key in production, or block storage of sensitive fields without encryption.

**Gateway auth falls back to unauthenticated connections:**
- Risk: if token lookup fails, the Gateway connects with an empty token.
- Files: `client/src/main/gateway-bridge.ts`
- Current mitigation: warning logs.
- Recommendations: fail closed or prompt user for explicit authentication when token is missing.

**Electron renderer sandbox disabled for main window and landing BrowserView:**
- Risk: reduced OS-level isolation if any renderer content is compromised.
- Files: `client/src/main/index.ts`
- Current mitigation: `contextIsolation: true`, `nodeIntegration: false`.
- Recommendations: enable `sandbox: true` where possible, especially for HTTP-loaded views.

**Device tokens stored in plaintext in the database:**
- Risk: DB compromise exposes active device tokens that can be used to spoof usage events.
- Files: `web/src/app/api/device-tokens/route.ts`, `web/src/app/api/usage-events/route.ts`
- Current mitigation: hashed tokens also stored, but raw token is persisted and used for lookup.
- Recommendations: store only hashes; validate via hash comparison; use non-reversible identifiers.

## Performance Bottlenecks

**Recursive file watchers can flood IPC on large directories:**
- Problem: `fs.watch` with `{ recursive: true }` emits many events and each event is forwarded to the renderer.
- Files: `client/src/main/ipc-handlers/file.ts`
- Cause: no backpressure, batching, or ignore patterns beyond a short debounce timer.
- Improvement path: switch to a watcher with glob ignores and batching (e.g. chokidar), cap watchers per app, and coalesce event payloads.

## Fragile Areas

**Gateway lifecycle depends on external OpenClaw process health and dynamic imports:**
- Files: `client/src/main/gateway-bridge.ts`, `client/src/main/openclaw.ts`
- Why fragile: process spawn + HTTP readiness polling + WebSocket handshake must all succeed; failures leave the app disconnected.
- Safe modification: keep the connection steps and timeouts in sync; add preflight checks for OpenClaw existence and Node version.
- Test coverage: only e2e coverage in `client/e2e/*.spec.ts`; no unit tests around the gateway lifecycle.

## Scaling Limits

**Per-process state does not scale horizontally:**
- Current capacity: one Node process; state resets on restart.
- Limit: multi-instance deployments lose rate limiting and channel state.
- Scaling path: centralized data stores (Redis/DB) and stateless handlers.
- Files: `web/src/lib/auth.ts`, `web/src/app/api/credits/deduct/route.ts`, `web/src/app/api/channels/route.ts`, `client/src/main/ipc-handlers/web.ts`

## Dependencies at Risk

**OpenClaw version requirement is not enforced at runtime:**
- Risk: security mitigations rely on OpenClaw >= 2026.3.12, but no runtime check prevents older bundles.
- Impact: a downgraded OpenClaw could reintroduce scope escalation issues.
- Migration plan: read OpenClaw version on startup and hard-fail or warn if below required version.
- Files: `client/src/main/gateway-bridge.ts`, `client/src/main/openclaw.ts`

## Missing Critical Features

**IM platform integration is stubbed:**
- Problem: channel connect/disconnect is mocked and never hits real IM SDKs.
- Blocks: real channel lifecycle and persistence.
- Files: `web/src/app/api/channels/route.ts`

**Google OAuth login not implemented:**
- Problem: UI advertises Google login but only shows a placeholder.
- Blocks: SSO onboarding and enterprise login flows.
- Files: `web/src/app/login/page.tsx`

## Test Coverage Gaps

**Core backend and IPC paths lack unit/integration tests:**
- What's not tested: IPC handlers, gateway lifecycle, billing/credits APIs, and auth logic.
- Files: `client/src/main/ipc-handlers/*.ts`, `client/src/main/gateway-bridge.ts`, `web/src/app/api/**/*.ts`, `web/src/lib/auth.ts`
- Risk: regressions in security-sensitive flows (billing, auth, filesystem access) can ship undetected.
- Priority: High
- Existing tests: e2e coverage only in `client/e2e/*.spec.ts` and `web/tests/e2e/*.spec.ts`.

---

*Concerns audit: 2026-04-03*

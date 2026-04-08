/**
 * ipc-handlers.ts — IPC Handler Aggregator
 *
 * Architecture: each domain is isolated in its own file under ./ipc-handlers/.
 * This file only imports and registers them — no handler logic here.
 *
 * Split rationale:
 *   gateway.ts  — All OpenClaw Gateway API pass-through (~120 handlers)
 *   file.ts     — File system ops with path validation
 *   shell.ts    — Window/Dialog/Shell/App utility handlers
 *   app.ts      — electron-store backed settings handlers
 *   clawhub.ts  — clawhub CLI integration
 *   web.ts      — SynClaw ↔ web platform API bridge (device token, usage reporting)
 *   path-validation.ts — Shared path validation utilities (no side-effects)
 */

import './ipc-handlers/gateway.js'
import './ipc-handlers/file.js'
import './ipc-handlers/shell.js'
import './ipc-handlers/app.js'
import './ipc-handlers/clawhub.js'
import './ipc-handlers/web.js'
import './ipc-handlers/security.js'
import './ipc-handlers/api-proxy.js'

// Legacy API: index.ts calls this to trigger registration.
// With ESM side-effect imports, registration happens on file load;
// this export keeps the old call site compatible.
export function registerIpcHandlers(): void {
  // Handlers self-register via side-effect imports above
}

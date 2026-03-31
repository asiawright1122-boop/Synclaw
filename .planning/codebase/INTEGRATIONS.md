# External Integrations

**Analysis Date:** 2026-03-31

## Architecture Overview

SynClaw uses a multi-process Electron architecture with OpenClaw Gateway as the core AI backend:

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer Process (React + Vite)                           │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │ window.openclaw API  │  window.electronAPI             │
│  └──────┬──────┘  └──────┬──────┘                          │
└─────────┼────────────────┼─────────────────────────────────┘
          │ IPC (contextBridge) │
┌─────────┼────────────────┼─────────────────────────────────┐
│  Main Process (Electron)                                    │
│  ┌──────▼──────────────────────────────────────┐          │
│  │  IPC Handlers (ipc-handlers/*.ts)            │          │
│  │  - gateway.ts  (120+ OpenClaw RPC methods)   │          │
│  │  - file.ts     (path-validated FS ops)       │          │
│  │  - shell.ts    (window/dialog/shell/app)     │          │
│  │  - app.ts      (settings + landing page)     │          │
│  │  - clawhub.ts  (clawhub CLI wrapper)         │          │
│  └──────┬──────────────────────────────────────┘          │
│  ┌──────▼──────────────────────────────────────┐          │
│  │  GatewayBridge (gateway-bridge.ts)          │          │
│  │  - WebSocket client to Gateway              │          │
│  │  - Auth token management                    │          │
│  │  - Security config propagation              │          │
│  └──────┬──────────────────────────────────────┘          │
│  ┌──────▼──────────────────────────────────────┐          │
│  │  OpenClaw Process (openclaw.ts)              │          │
│  │  - Child process spawn via tsx               │          │
│  │  - Node.js subprocess on port 18789           │          │
│  └───────────────────────────────────────────────┘          │
│  ┌───────────────────────────────────────────────┐          │
│  │  BrowserView: Landing Page (Next.js standalone)│          │
│  │  - Port 3847, 127.0.0.1                       │          │
│  └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## IPC Channels

### OpenClaw Gateway Channels (`openclaw:*`)

**Lifecycle:**
- `openclaw:status` — Get connection status
- `openclaw:connect` — Connect to Gateway
- `openclaw:disconnect` — Disconnect from Gateway
- `openclaw:reconnect` — Reconnect to Gateway
- `openclaw:statusChange` — Event: status changed

**Sessions:**
- `openclaw:sessions:list` — List sessions
- `openclaw:sessions:patch` — Update session
- `openclaw:sessions:reset` — Reset session
- `openclaw:sessions:delete` — Delete session
- `openclaw:sessions:compact` — Compact sessions
- `openclaw:sessions:preview` — Preview session content
- `openclaw:sessions:usage` — Get session usage stats

**Chat:**
- `openclaw:chat:send` — Send chat message
- `openclaw:chat:history` — Get chat history
- `openclaw:chat:abort` — Abort chat
- `openclaw:chat:inject` — Inject message

**Agent:**
- `openclaw:agent` — Run agent
- `openclaw:agent:wait` — Wait for agent completion
- `openclaw:agent:identity` — Get agent identity

**Skills:**
- `openclaw:skills:status` — Get skill status
- `openclaw:skills:install` — Install skill
- `openclaw:skills:update` — Update skill

**Config:**
- `openclaw:config:get` — Get config
- `openclaw:config:set` — Set config
- `openclaw:config:patch` — Patch config
- `openclaw:config:apply` — Apply config
- `openclaw:config:schema` — Get config schema
- `openclaw:config:schema:lookup` — Lookup schema value

**Models:**
- `openclaw:models:list` — List available models
- `openclaw:models:getCurrent` — Get current model
- `openclaw:models:setCurrent` — Set current model
- `openclaw:models:configure` — Configure model params

**Memory:**
- `openclaw:memory:search` — Search memory
- `openclaw:memory:list` — List memories
- `openclaw:memory:delete` — Delete memory
- `openclaw:memory:store` — Store memory

**Cron:**
- `openclaw:cron:list` — List cron jobs
- `openclaw:cron:status` — Get cron status
- `openclaw:cron:add` — Add cron job
- `openclaw:cron:update` — Update cron job
- `openclaw:cron:remove` — Remove cron job
- `openclaw:cron:run` — Run cron job
- `openclaw:cron:runs` — Get cron runs

**Hooks:**
- `openclaw:hooks:list` — List hooks
- `openclaw:hooks:add` — Add hook
- `openclaw:hooks:update` — Update hook
- `openclaw:hooks:remove` — Remove hook
- `openclaw:hooks:runs` — Get hook runs

**Logs:**
- `openclaw:logs:tail` — Tail logs

**Tools:**
- `openclaw:tools:catalog` — Get tools catalog

**TTS:**
- `openclaw:tts:status` — TTS status
- `openclaw:tts:providers` — TTS providers
- `openclaw:tts:enable` — Enable TTS
- `openclaw:tts:disable` — Disable TTS
- `openclaw:tts:convert` — Convert text to speech
- `openclaw:tts:setProvider` — Set TTS provider

**Channels:**
- `openclaw:channels:status` — Channel status
- `openclaw:channels:configure` — Configure channel
- `openclaw:channels:disconnect` — Disconnect channel
- `openclaw:channels:send` — Send via channel
- `openclaw:channels:logout` — Logout from channel

**Avatars:**
- `openclaw:agents:list` — List avatars
- `openclaw:agents:create` — Create avatar
- `openclaw:agents:update` — Update avatar
- `openclaw:agents:delete` — Delete avatar

**Agent Files:**
- `openclaw:agents:files:list` — List agent files
- `openclaw:agents:files:get` — Get agent file
- `openclaw:agents:files:set` — Set agent file

**Web Login:**
- `openclaw:web:login:start` — Start web login
- `openclaw:web:login:wait` — Wait for web login

**Device/Node:**
- `openclaw:device:pair:list` — List paired devices
- `openclaw:device:pair:approve` — Approve device
- `openclaw:device:pair:reject` — Reject device
- `openclaw:device:pair:remove` — Remove device
- `openclaw:device:token:rotate` — Rotate device token
- `openclaw:device:token:revoke` — Revoke device token
- `openclaw:node:pair:request` — Request node pair
- `openclaw:node:pair:list` — List node pairs
- `openclaw:node:pair:approve` — Approve node pair
- `openclaw:node:pair:reject` — Reject node pair
- `openclaw:node:pair:verify` — Verify node pair
- `openclaw:node:rename` — Rename node
- `openclaw:node:list` — List nodes
- `openclaw:node:describe` — Describe node
- `openclaw:node:pending:*` — Pending operations
- `openclaw:node:invoke` — Invoke node
- `openclaw:node:event` — Node event

**Exec Approvals:**
- `openclaw:exec:approvals:get` — Get approvals
- `openclaw:exec:approvals:set` — Set approvals
- `openclaw:exec:approvals:node:get` — Get node approvals
- `openclaw:exec:approvals:node:set` — Set node approvals
- `openclaw:exec:approval:request` — Request approval
- `openclaw:exec:approval:waitDecision` — Wait for decision
- `openclaw:exec:approval:resolve` — Resolve approval

**Wizard:**
- `openclaw:wizard:start` — Start wizard
- `openclaw:wizard:next` — Wizard next step
- `openclaw:wizard:cancel` — Cancel wizard
- `openclaw:wizard:status` — Wizard status

**Usage:**
- `openclaw:usage:status` — Usage status
- `openclaw:usage:cost` — Usage cost

**User:**
- `openclaw:user:getPoints` — Get user points
- `openclaw:user:getPointsHistory` — Get points history

**Health/Gateway:**
- `openclaw:health` — Health check
- `openclaw:status:get` — Get status
- `openclaw:gateway:identity` — Get gateway identity

**Other:**
- `openclaw:update:run` — Run update
- `openclaw:send` — Send message
- `openclaw:poll` — Poll for response
- `openclaw:push:test` — Test push
- `openclaw:voicewake:get` / `set` — Voice wake
- `openclaw:browser:request` — Browser request
- `openclaw:system:presence` — System presence
- `openclaw:system:event` — System event
- `openclaw:talk:config` — Talk config
- `openclaw:talk:mode` — Talk mode
- `openclaw:doctor:memory:status` — Doctor memory status
- `openclaw:event` — Event listener (renderer)

### File Operations (`file:*`)
- `file:read` — Read file
- `file:readBinary` — Read binary file
- `file:write` — Write file
- `file:list` — List directory
- `file:delete` — Delete file/directory
- `file:stat` — Get file stats
- `file:mkdir` — Create directory
- `file:exists` — Check file exists
- `file:rename` — Rename file
- `file:copy` — Copy file
- `file:validate` — Validate path
- `file:watch` — Watch directory
- `file:unwatch` — Unwatch directory
- `file:changed` — Event: file changed

### Shell/Dialog (`shell:*`, `dialog:*`)
- `shell:openPath` — Open file path
- `shell:openExternal` — Open external URL
- `shell:showItemInFolder` — Show in folder
- `path:expandTilde` — Expand ~ in path
- `dialog:openFile` — Open file dialog
- `dialog:saveFile` — Save file dialog
- `dialog:selectDirectory` — Select directory

### Window Controls (`window:*`)
- `window:minimize` — Minimize window
- `window:maximize` — Maximize/restore window
- `window:close` — Close window
- `window:isMaximized` — Check if maximized
- `window:toggleFullScreen` — Toggle fullscreen
- `window:maximizeChange` — Event: maximize state changed

### App Settings (`settings:*`)
- `settings:get` — Get settings
- `settings:set` — Set setting
- `settings:reset` — Reset settings
- `settings:changed` — Event: settings changed

### Landing Page (`landing:*`)
- `landing:isAvailable` — Check if landing page available
- `landing:show` — Show landing page
- `landing:hide` — Hide landing page

### App (`app:*`)
- `app:getVersion` — Get app version
- `app:getPath` — Get app path
- `app:setAutoLaunch` — Set auto launch
- `app:getAutoLaunch` — Get auto launch
- `app:downloadUpdate` — Download update
- `app:installUpdate` — Install update

### UI Actions (`ui:*`, `navigate`)
- `ui:openCredits` — Open credits
- `ui:openSettings` — Open settings
- `ui:openAvatarCreate` — Open avatar create
- `navigate` — Event: navigate to page

### ClawHub (`clawhub:*`)
- `clawhub:status` — Check clawhub status
- `clawhub:list` — List skills
- `clawhub:search` — Search skills
- `clawhub:install` — Install skill
- `clawhub:update` — Update skill
- `clawhub:check` — Check skill requirements
- `clawhub:uninstall` — Uninstall skill
- `clawhub:installCli` — Install clawhub CLI

### Web Platform Bridge (`web:*`)
- `web:register` — Register SynClaw device with web platform (returns device token)
- `web:report-usage` — Report AI usage events to web platform
- `web:revoke` — Revoke device token on logout

### Notifications
- `notifications:setEnabled` — Enable/disable notifications
- `openclaw:update-available` — Event: update available
- `openclaw:update-downloaded` — Event: update downloaded
- `focus-chat-input` — Event: focus chat input

## OpenClaw Gateway Integration

**Type:** Child process + WebSocket bridge

**Connection Flow:**
1. Start OpenClaw subprocess via `tsx openclaw.mjs`
2. Poll HTTP `/ready` until Gateway is ready
3. Fetch auth token from `~/.openclaw/config.json`
4. Connect WebSocket to `ws://127.0.0.1:18789`
5. Apply security config via `config.patch`

**Security Configuration:**
- `gateway.tools.deny` — Block dangerous tools
- `agents.defaults.sandbox` — Docker isolation for sub-sessions
- `tools.profile` — Minimal tool profile
- `tools.fs.workspaceOnly` — File system workspace isolation
- `tools.exec.security` — Execution requires approval

**Path:** `client/resources/openclaw-source/` (packaged) or `app.getAppPath() + '/resources/openclaw-source'` (dev)

## BrowserView Usage

**Landing Page:**
- Type: Next.js standalone server
- Port: 3847 (configurable via `LANDING_PORT`)
- Host: 127.0.0.1
- Embedded via BrowserView in main window
- Position: x=260, fills remaining width

**Process Management:**
- Spawned as child process via `spawn(process.execPath, [server.js])`
- Killed on app quit via SIGTERM
- Fallback URL after 15s timeout

## ClawHub Integration

**Type:** CLI wrapper (spawn-based)

**Commands:**
- `clawhub --version` — Check installation
- `clawhub list --json` — List skills
- `clawhub search <query> --json` — Search skills
- `clawhub install <name> [--version <ver>]` — Install skill
- `clawhub update [--all]` — Update skills
- `clawhub check --json` — Check requirements
- `clawhub uninstall <name>` — Uninstall skill
- `npm i -g clawhub` — Install CLI

## Data Storage

**electron-store (main process):**
- `settings.json` — App settings
- `window-state.json` — Window bounds

**Location:** `app.getPath('userData')`

**Encryption:** Optional via `STORE_ENCRYPTION_KEY`

## External Services

**AI Backend:**
- OpenClaw Gateway (bundled)
- Claude API (user-provided key)

**Update:**
- electron-updater (GitHub releases)

**Web Platform API:**
- `web/` Next.js app (separate git repo)
- PostgreSQL database (user-managed)
- Stripe payment integration
- Device token: `synclaw_dev_<hex>` stored in `DeviceToken` table
- Usage events reported via `POST /api/usage-events` (device token auth)
- Device registration via `POST /api/device-tokens` (JWT auth)

## Environment Variables

**Required for Production:**
- `STORE_ENCRYPTION_KEY` — Optional encryption key
- `LANDING_PORT` — Optional landing page port

**Used Internally:**
- `OPENCLAW_HOME` — OpenClaw config directory
- `SKIP_UPDATE_CHECK` — Skip update check (dev)
- `NODE_ENV` — Development/production mode

---

*Integration audit: 2026-03-31*

# External Integrations

**Analysis Date:** 2026-04-03

## APIs & External Services

**AI Gateway & Providers:**
- OpenClaw Gateway local process (AI backend over WebSocket/HTTP) - `client/src/main/openclaw.ts`, `client/src/main/gateway-bridge.ts`, `DEVELOPMENT_GUIDELINES.md`
- Gateway client binding (`GatewayClient` via openclaw-source) - `client/src/main/gateway-bridge.ts`, `client/resources/openclaw-source/package.json`
- Gateway auth env vars (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`, `OPENCLAW_GATEWAY_URL`, `OPENCLAW_GATEWAY_PORT`) - `client/resources/openclaw-source/docs/gateway/remote.md`
- OpenClaw model provider catalog (OpenAI, Anthropic, Bedrock, Google, etc.) - `client/resources/openclaw-source/docs/providers/index.md`

**Messaging/Channel Integrations:**
- OpenClaw channel catalog (Slack, Discord, Telegram, WhatsApp, etc.) - `client/resources/openclaw-source/docs/channels/index.md`

**Payments:**
- Stripe API (subscriptions, credits, checkout) - `web/src/lib/stripe.ts`, `web/src/app/api/subscription/checkout/route.ts`, `web/src/app/api/credits/purchase/route.ts`
- Stripe webhooks endpoint - `web/src/app/api/webhooks/stripe/route.ts`
- Stripe auth/config env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `STRIPE_PRICE_CREDITS_*`) - `web/src/lib/stripe.ts`, `web/src/app/api/webhooks/stripe/route.ts`, `web/src/app/api/credits/purchase/route.ts`

**Email:**
- Resend API for transactional email - `web/src/lib/email.ts`
- Email env vars (`RESEND_API_KEY`, `FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`) - `web/src/lib/email.ts`

**Skills Registry:**
- ClawHub CLI integration (skills search/install/update) - `client/src/main/ipc-handlers/clawhub.ts`, `client/src/renderer/components/SkillsMarketPanel.tsx`

**Package Registry:**
- OpenClaw download via npm registry (override with `OPENCLAW_NPM_REGISTRY`) - `client/scripts/download-openclaw.mjs`

**Updates/Distribution:**
- Auto-update feed URL (`UPDATER_FEED_URL`) - `client/src/main/updater.ts`
- Apple notarization + codesign in builds - `client/scripts/notarize.mjs`, `client/electron-builder.yml`, `.github/workflows/release.yml`

**Web ↔ Gateway:**
- Web API proxy to Gateway (`GATEWAY_URL`) - `web/api/notifications/route.ts`, `web/api/credits/history/route.ts`

## Data Storage

**Databases:**
- PostgreSQL via Prisma (`DATABASE_URL`) - `web/prisma/schema.prisma`, `web/src/lib/prisma.ts`

**File Storage:**
- Electron app settings via electron-store (local filesystem) - `client/src/main/index.ts`
- OpenClaw home/state directory (`OPENCLAW_HOME`, `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH`) - `client/src/main/openclaw.ts`, `client/resources/openclaw-source/docs/help/debugging.md`

**Caching:**
- Not detected (no cache service configuration in app manifests) - `client/package.json`, `web/package.json`

## Authentication & Identity

**Auth Provider:**
- NextAuth credentials auth (DB-backed) - `web/src/lib/auth.ts`, `web/package.json`
- OpenClaw Gateway auth token/password - `client/resources/openclaw-source/docs/gateway/remote.md`, `client/src/main/gateway-bridge.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no third-party error tracking SDKs) - `client/package.json`, `web/package.json`

**Logs:**
- electron-log (desktop) - `client/src/main/logger.ts`
- Web API logging via console - `web/src/app/api/webhooks/stripe/route.ts`

## CI/CD & Deployment

**Hosting:**
- Desktop distribution via electron-builder artifacts - `client/electron-builder.yml`, `.github/workflows/release.yml`
- Web app deploy target implied by Next.js standalone output - `web/next.config.ts`

**CI Pipeline:**
- GitHub Actions CI - `.github/workflows/ci.yml`
- GitHub Actions release builds - `.github/workflows/release.yml`

## Environment Configuration

**Required env vars:**
- Web DB: `DATABASE_URL` - `web/prisma/schema.prisma`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `STRIPE_PRICE_CREDITS_*` - `web/src/lib/stripe.ts`, `web/src/app/api/webhooks/stripe/route.ts`, `web/src/app/api/credits/purchase/route.ts`
- Email: `RESEND_API_KEY`, `FROM_EMAIL`, `NEXT_PUBLIC_APP_URL` - `web/src/lib/email.ts`
- Gateway access: `GATEWAY_URL`, `WEB_API_BASE` - `web/api/notifications/route.ts`, `client/src/main/ipc-handlers/web.ts`
- Desktop security/update: `STORE_ENCRYPTION_KEY`, `UPDATER_FEED_URL` - `client/src/main/index.ts`, `client/src/main/updater.ts`
- OpenClaw runtime: `OPENCLAW_HOME`, `OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`, `OPENCLAW_GATEWAY_URL`, `OPENCLAW_GATEWAY_PORT` - `client/src/main/openclaw.ts`, `client/resources/openclaw-source/docs/gateway/remote.md`
- Build notarization: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `CSC_LINK`, `CSC_KEY_PASSWORD` - `client/scripts/notarize.mjs`, `.github/workflows/release.yml`
- OpenClaw download: `OPENCLAW_NPM_REGISTRY` - `client/scripts/download-openclaw.mjs`

**Secrets location:**
- Web env files (local + examples present; do not commit secrets) - `web/.env.local`, `web/.env.example`, `client/.env.example`
- Electron settings encrypted by `STORE_ENCRYPTION_KEY` when set - `client/src/main/index.ts`
- OpenClaw credentials/state live in the OpenClaw state directory - `client/resources/openclaw-source/docs/help/debugging.md`

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks endpoint - `web/src/app/api/webhooks/stripe/route.ts`

**Outgoing:**
- Web app calls Gateway API for notifications and credits history - `web/api/notifications/route.ts`, `web/api/credits/history/route.ts`

---

*Integration audit: 2026-04-03*

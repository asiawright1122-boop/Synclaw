---
phase: "08"
phase_name: "web-verify"
status: "complete"
started: "2026-04-01T01:36:00.000Z"
---

# Phase 8: WEB-VERIFY — Research Findings

## T-WEB-VERIFY-01: OpenClaw API Communication

**Finding:** ✅ Partially confirmed (limited integration)

`web/` implements two standalone API routes outside `web/src/` that communicate with the OpenClaw Gateway:

| Route | Target | Auth | Status |
|-------|--------|------|--------|
| `web/api/credits/history/route.ts` | `GET /api/credits/history` (Gateway port 18789) | NextAuth session cookie | ✅ Active |
| `web/api/notifications/route.ts` | `GET /api/notifications` (Gateway port 18789) | NextAuth session cookie | ✅ Graceful degrade |

- **Authentication:** NextAuth JWT sessions via `getServerSession(authOptions)` from `web/src/lib/auth.ts`
- **Connectivity:** Direct HTTP fetch from Next.js API route to Gateway port 18789 (server-side)
- **No `window.openclaw` bridge** — web communicates server-side, not via Electron IPC
- **Fallback behavior:** `api/notifications` returns `{ data: [] }` on network error
- **Remaining 73+ source files:** Use Next.js API routes + Prisma/Postgres only

**Gap (R-WEB-04):** web ↔ main app communication is **not bidirectional**. The web app has its own auth (NextAuth + Postgres) and does not exchange state with the Electron client. This is BY DESIGN — `web/` is an independent landing/marketing page. R-WEB-04 is effectively N/A for web/ ↔ main app communication since they are separate apps sharing the Gateway.

---

## T-WEB-VERIFY-02: Dark Theme Consistency

**Finding:** ⚠️ Semantic consistency, different technical implementation

| Aspect | `web/` (`src/app/globals.css`) | `client/` (`renderer/styles/globals.css`) |
|--------|-------------------------------|-----------------------------------------|
| Accent | `--color-amber` (#E8A838) | `--accent1` (#fc5d1e) |
| Text hierarchy | `--color-text-0/1/2/3` (0-3 scale) | `--text`, `--text-sec`, `--text-ter` (named tiers) |
| Backgrounds | `--color-void/surface/raised/overlay` | `--bg-base/layout/container/elevated` |
| Border | `--color-border` (#1E1E22) | `--border` (rgba-based) |
| CSS framework | Tailwind v4 `@theme inline` | Tailwind v3 CSS custom properties |
| Radius | `--radius-sm/md/lg` | `--radius-sm/md/lg` | ✅ |

- Both use dark minimal aesthetic with similar visual weight
- Different naming taxonomies — they do NOT share a CSS variable contract
- No shared design token file between `web/` and `client/`
- **Recommendation:** If future integration is needed, consider a shared `design-tokens.css` package

**Gap (R-WEB-05):** Not a bug — two independent UIs with consistent visual intent but different technical token systems. Close as "by design, documented."

---

## T-WEB-VERIFY-03: Avatar Skills Permission Field

**Finding:** ✅ Documented (web/ uses API key permissions, not avatar templates)

- `web/` has no `avatar-templates.ts`
- `web/` uses API key permissions scoped to IM channel features:
  - DB: `ApiKey.permissions: String[]` (Prisma)
  - Validation: `{ readHistory, sendMessage, manageSkills, manageFiles, manageChannels }` (Zod booleans)
  - Runtime default: `['read:history', 'send:message']` (string array)
- **This is a separate concept from avatar personality templates** — avatar templates (5 built-in personas) are a client feature, not web/

**Gap (R-AVA-07):** R-AVA-07 is about "avatar skills permissions" (different avatars using different skills). The web's API key permissions are for channel-level access control, which is a different concern. Close as N/A — web/ does not implement avatar personality templates, and its permissions system is for IM channels.

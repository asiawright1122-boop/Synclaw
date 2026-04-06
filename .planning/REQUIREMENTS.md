# Requirements — v1.6 P3 UI 完善冲刺

**Milestone:** v1.6 P3 UI 完善冲刺
**Status:** Active
**Created:** 2026-04-06
**Requirements:** 7 | **Completed:** 0

---

## A — SkillsPanel 安装进度

### SKL-01
**User can see real-time installation progress for skills.**

SkillsPanel listens for `skill:progress` events (or `skill:status-changed`) from the Gateway and updates the installation state. While a skill is installing, its list item displays an inline progress bar with the current status message.

**Acceptance criteria:**
- [ ] `window.openclaw.on('skill:progress', cb)` or `skill:status-changed` listener added in SkillsPanel
- [ ] Payload `{ skillKey, status, progress?, message? }` correctly typed
- [ ] Installing skill item shows inline progress bar (not a blocking modal)
- [ ] Progress bar disappears or transitions to "enabled" state on completion

**Type:** Feature
**Priority:** P3
**Source:** BACKLOG.md P3, Phase 24

---

### SKL-02
**Installing skill shows inline progress bar with status message.**

While a skill is being installed, its card/row in the SkillsPanel list displays a horizontal progress bar with a status label (e.g., "下载中...", "配置中...", "完成"). The progress bar uses the existing design system (Tailwind + CSS variables).

**Acceptance criteria:**
- [ ] Progress bar renders inside the skill list item (not a separate overlay/modal)
- [ ] Progress percentage shown when `progress` field is available
- [ ] Status message displayed alongside the bar (e.g., "正在配置工具链...")
- [ ] Bar fills left-to-right as installation proceeds

**Type:** Feature
**Priority:** P3
**Source:** BACKLOG.md P3

---

### SKL-03
**Installation completes or fails with clear user feedback.**

When installation finishes, the progress bar is replaced by the normal "enabled"/"disabled" badge. If it fails, an error message is shown (not silently ignored), and the skill returns to its previous state.

**Acceptance criteria:**
- [ ] Success: progress bar replaced by normal badge, skill appears in enabled list
- [ ] Failure: error message shown (e.g., via toast), skill returns to prior state
- [ ] `skill:error` event listener added (if Gateway emits one)

**Type:** Feature
**Priority:** P3
**Source:** BACKLOG.md P3

---

## B — IM 频道管理 UI 精简

### IM-01
**Remove the disabled "编辑" placeholder button from channel cards.**

The "编辑" button in each channel card is currently always disabled with tooltip "配置编辑功能开发中". Since this is a placeholder, it should be removed to reduce UI noise.

**Acceptance criteria:**
- [ ] "编辑" button removed from channel card component
- [ ] No broken or disabled UI elements remain
- [ ] Card layout still looks balanced after removal

**Type:** UX improvement
**Priority:** P3
**Source:** BACKLOG.md P3

---

### IM-02
**Platform selector hides descriptive text, shows on hover.**

Each platform button in the "添加频道" form currently shows a full description (`meta.desc`) that is redundant for users who already know which platform they use. Hide it by default, show on hover.

**Acceptance criteria:**
- [ ] Platform buttons show only icon + name by default
- [ ] Hover reveals the description text in a tooltip or inline expansion
- [ ] Existing platform list remains functional

**Type:** UX improvement
**Priority:** P3
**Source:** BACKLOG.md P3

---

### IM-03
**IM empty state CTA text is corrected to "添加第一个频道".**

The empty state button currently says "开始新对话" which is misleading — users coming to the IM panel want to add channels, not start conversations. Change to "添加第一个频道".

**Acceptance criteria:**
- [ ] Empty state button text updated to "添加第一个频道"
- [ ] Empty state icon and layout unchanged

**Type:** Content / UX fix
**Priority:** P3
**Source:** BACKLOG.md P3

---

### IM-04
**Channel list uses compact row layout instead of full-width cards.**

The current channel list renders each channel as a full-width card with generous padding. For a settings panel, a more compact list row is appropriate. Refactor to reduce vertical space and visual hierarchy.

**Acceptance criteria:**
- [ ] Channel cards replaced by compact list rows
- [ ] Each row shows: platform icon, name, status pill, action buttons
- [ ] "断开" button retained (or removed per IM-01 decision)
- [ ] No functional changes — only layout/style refactor

**Type:** UX improvement
**Priority:** P3
**Source:** BACKLOG.md P3

---

## Traceability

| REQ | Phase | Criteria | Status |
|-----|-------|---------|--------|
| SKL-01 | Phase 24 | SkillsPanel event listeners | - |
| SKL-02 | Phase 24 | Inline progress bar | - |
| SKL-03 | Phase 24 | Completion/error feedback | - |
| IM-01 | Phase 25 | Remove 编辑 button | - |
| IM-02 | Phase 25 | Platform selector tooltip | - |
| IM-03 | Phase 25 | Empty state text fix | - |
| IM-04 | Phase 25 | Compact row layout | - |

---

## Out of Scope

| Item | Reason |
|------|--------|
| Keytar / macOS Keychain integration | v2.0 scope — requires deeper security architecture |
| Control UI WebView integration | v2.0 scope — large feature requiring design work |
| IM channel message history | Not in BACKLOG, separate feature |
| Skill installation from within SkillsPanel | SkillsPanel only manages existing skills; new installs happen via Agent |

---

*Last updated: 2026-04-06*

# Roadmap — SynClaw

## Milestones

- ✅ **v1.6 P3 UI 完善冲刺** — Phases 24–25 (shipped 2026-04-06)
- ✅ **v1.5 P2 架构与质量债** — Phases 20–23 (shipped 2026-04-06) · [Archive](./milestones/v1.5-ROADMAP.md)
- ✅ **v1.4 安全加固冲刺** — Phases 15–19 (shipped 2026-04-06) · [Archive](./milestones/v1.4-ROADMAP.md)
- ✅ **v1.3 首发就绪冲刺** — Phases 10–14 (shipped 2026-04-01)
- 🚧 **Next milestone** — Not yet planned

---

## Current: v1.6 P3 UI 完善冲刺 ✅ SHIPPED 2026-04-06

<details>
<summary>Phase 24–25 Details (click to expand)</summary>

### Phase 24: SkillsPanel 安装进度 ✅

**Goal:** SkillsPanel 安装过程中显示实时进度条，替代原来无反馈的静默等待。

- [x] SKL-01: SkillsPanel 监听 `skill:progress` / `skill:status-changed` 事件
- [x] SKL-02: 内联进度条（progress bar + status message）
- [x] SKL-03: 安装完成进度条消失；安装失败显示错误 toast

**Commits:** `604a34946`, `a2c57086b`, `e401e4662`, `a4183d4d2`

---

### Phase 25: IM 频道管理 UI 精简 ✅

**Goal:** 移除 IM 面板中的占位 UI 和视觉噪音，修正误导文字，使用紧凑行布局。

- [x] IM-01: 删除频道卡片中的"编辑"占位按钮
- [x] IM-02: 平台选择器默认隐藏 desc，hover 显示 tooltip
- [x] IM-03: 空状态按钮文字改为"添加第一个频道"
- [x] IM-04: 频道列表从 Card 改为紧凑行布局

**Commits:** `073ffec54`, `8182bd7c2`, `aabac1ea5`, `d62652da1`

</details>

---

## Progress Table

| Phase | Name | Requirements | Status | Completed |
|-------|------|-------------|--------|-----------|
| 24 | SkillsPanel 安装进度 | SKL-01–03 | ✅ Complete | 2026-04-06 |
| 25 | IM 频道管理 UI 精简 | IM-01–04 | ✅ Complete | 2026-04-06 |

---

## Archived Milestones

See `.planning/milestones/` for full archives:
- `v1.6-ROADMAP.md` / `v1.6-REQUIREMENTS.md`
- `v1.5-ROADMAP.md` / `v1.5-REQUIREMENTS.md`
- `v1.4-ROADMAP.md`
- `v1.3-MILESTONE-ARCHIVE.md` / `v1.3-REQUIREMENTS.md`
- `v1.2-MILESTONE-ARCHIVE.md` / `v1.2-REQUIREMENTS.md`

---

*Roadmap created: 2026-04-07 — v1.6 shipped*

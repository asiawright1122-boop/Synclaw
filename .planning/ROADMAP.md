# ROADMAP — v1.6 P3 UI 完善冲刺

**Milestone:** v1.6
**Created:** 2026-04-06
**Phases:** 2 | **Requirements:** 7 | **Covered:** 7/7 ✓

---

### Phase 24: SkillsPanel 安装进度

**Goal:** SkillsPanel 安装过程中显示实时进度条，替代原来无反馈的静默等待。

**Depends on:** None

**Requirements:** SKL-01, SKL-02, SKL-03

**Success Criteria** (what must be TRUE):
1. SkillsPanel 监听 `skill:progress` 或 `skill:status-changed` 事件，更新安装状态
2. 正在安装的 skill 在列表中显示内联进度条（progress bar + status message）
3. 安装完成后进度条消失或变为已启用状态；安装失败显示错误 toast

---

### Phase 25: IM 频道管理 UI 精简

**Goal:** 移除 IM 面板中的占位 UI 和视觉噪音，修正误导文字，使用紧凑行布局。

**Depends on:** None

**Requirements:** IM-01, IM-02, IM-03, IM-04

**Success Criteria** (what must be TRUE):
1. 频道卡片中删除"编辑"占位按钮
2. 平台选择器默认隐藏 desc 描述，hover 显示 tooltip
3. 空状态按钮文字改为"添加第一个频道"
4. 频道列表从 Card 改为紧凑行布局

---

## Progress Table

| Phase | Name | Requirements | Status | Completed |
|-------|------|-------------|--------|-----------|
| 24 | SkillsPanel 安装进度 | SKL-01–03 | 🚧 Planning | — |
| 25 | IM 频道管理 UI 精简 | IM-01–04 | 🚧 Planning | — |

---

*Roadmap created: 2026-04-06 for v1.6 P3 UI 完善冲刺*

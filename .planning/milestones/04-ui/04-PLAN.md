# Phase 4: 技能市场 UI — 执行计划

---

```yaml
---
phase: 04-ui
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/renderer/components/SkillsPanel.tsx
  - client/src/renderer/components/SettingsView.tsx
  - client/src/renderer/components/CommandPalette.tsx
autonomous: true
requirements:
  - SKIL-01
  - SKIL-02
  - SKIL-03
must_haves:
  truths:
    - "技能市场页面能展示技能卡片列表，并支持分类筛选与搜索"
    - "点击技能卡片会打开技能详情（至少包含描述与配置项）"
    - "在技能市场中点击安装/卸载后，技能安装状态在列表中及时更新"
    - "安装后技能会出现在“技能”面板中（并且该面板会自动刷新）"
    - "安装/卸载按钮在执行过程中有明确加载态，并在成功/失败时给出结果反馈"
  artifacts:
    - path: client/src/renderer/components/SkillsPanel.tsx
      provides: "技能市场卡片列表、分类/搜索、详情弹窗、安装/卸载操作"
    - path: client/src/renderer/components/SettingsView.tsx
      provides: "技能市场入口（NAV/section case）与技能面板自动刷新 + 安装状态展示"
    - path: client/src/renderer/components/CommandPalette.tsx
      provides: "命令面板入口，能打开技能市场页面"
  key_links:
    - from: client/src/renderer/components/SkillsPanel.tsx
      to: window.openclaw.skills.status()
      via: "list fetch in useEffect/load function"
      pattern: "skills\\.status\\("
    - from: client/src/renderer/components/SkillsPanel.tsx
      to: window.openclaw.skills.install()
      via: "install button handler"
      pattern: "skills\\.install\\("
    - from: client/src/renderer/components/SkillsPanel.tsx
      to: window.openclaw.skills.update()
      via: "uninstall/update button handler"
      pattern: "skills\\.update\\("
    - from: client/src/renderer/components/SettingsView.tsx
      to: window.openclaw.on()
      via: "skill:* event subscription to reload skills panel"
      pattern: "skill:installed|skill:status-changed"
---
```

---
<objective>
实现 Phase 4 的“技能市场 UI”：提供技能卡片浏览（分类+搜索）、详情弹窗、并支持从市场一键安装/卸载；同时让安装后的技能能自动出现在“技能”面板并显示明确安装状态。

Purpose: 满足 SKIL-01/02/03，让用户能在桌面端直观看到技能生态入口并完成安装闭环。
Output: 新的技能市场 UI + Settings/CommandPalette 入口 + 技能面板事件驱动刷新。
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

client/src/renderer/components/SkillsPanel.tsx
client/src/renderer/components/SettingsView.tsx
client/src/renderer/components/CommandPalette.tsx
client/src/preload/index.ts
client/src/main/ipc-handlers.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: 增强 SkillsPanel 为技能市场</name>
  <files>client/src/renderer/components/SkillsPanel.tsx</files>
  <read_first>
    - client/src/renderer/components/SkillsPanel.tsx
    - client/src/preload/index.ts (openclaw.skills.status/install/update 签名)
    - client/src/main/ipc-handlers.ts (openclaw:skills:* handler 映射)
    - client/src/renderer/components/Toast.tsx (useToastStore / toast store API，用于结果反馈)
  </read_first>
  <action>
    1. 在 `SkillsPanel.tsx` 中将现有“技能列表 + 分类 + 搜索 + 安装弹窗”的能力扩展为技能市场闭环：
       - 保留分类分组与搜索输入（现有 `categoryIcons`、`searchQuery`、`inferCategory()` 与过滤逻辑）。
       - 将每个技能卡片上的“已启用/已禁用”语义改为“已安装/未安装”（使用现有 `skill.enabled` 作为 installed 判定：`enabled === true` -> 已安装，`enabled === false` -> 未安装）。
       - 卡片内为每个技能增加明确的安装/卸载按钮（installed -> 卸载、未安装 -> 安装），按钮在执行时显示加载态并禁用二次点击。
    2. 为“点击技能卡片显示详情（含配置项）”新增详情弹窗：
       - 新增 `showDetailsModal: boolean` 和 `detailsApiKey: string`（用于展示/配置 API Key）。
       - 在点击卡片（或卡片右侧按钮之外的区域）时：设置 `selectedSkill` 并 `setShowDetailsModal(true)`。
       - 详情弹窗中必须渲染：技能 `name`、`description`、安装状态（已安装/未安装）、API Key 配置区（输入框 + 保存按钮）。
       - API Key 保存按钮调用 `window.openclaw.skills.update({ skillKey: selectedSkill.name, apiKey: detailsApiKey.trim() || undefined })`，保存后刷新技能列表（复用现有 `loadSkills()`）。
    3. 实现安装/卸载逻辑并刷新 UI：
       - 安装按钮（未安装 -> 已安装）调用：
         `window.openclaw.skills.install({ installId: skill.name, ...(detailsApiKey.trim() ? { apiKey: detailsApiKey.trim() } : {}) })`
         安装按钮默认使用“详情弹窗中的 API Key 输入”（若用户未打开详情弹窗则按空字符串处理，不传 apiKey）。
       - 卸载按钮调用：
         `window.openclaw.skills.update({ skillKey: skill.name, enabled: false })`
       - 安装/卸载成功后调用 `loadSkills()`，并使用 toast store 给出成功反馈；失败则 toast 错误反馈。
    4. 结果反馈与加载态：
       - 在安装/卸载中分别维护 `installingSkillKey` 与 `uninstallingSkillKey`（或复用现有状态但必须能区分当前按钮）。
       - 点击安装/卸载按钮时，按钮显示加载文案（例如“安装中...”/“卸载中...”）或 spinner，并设置 `disabled=true`。
    5. 保底与断连：
       - 保留 `FALLBACK_SKILLS` 作为 offline/Gateway disconnected 的兜底渲染；确保列表不会空白。
  </action>
  <acceptance_criteria>
    - 页面能渲染技能卡片列表，并支持搜索（匹配 name/description）。
    - 列表按分类分组展示，分类来自 `skill.category` 或 `inferCategory(skill.name)`。
    - 卡片点击可打开详情弹窗，弹窗包含：技能描述 + API Key 配置输入框 + 保存按钮。
    - 每个卡片在“已安装/未安装”状态下分别显示“卸载/安装”按钮，并在点击时有明确加载态（按钮禁用 + loading文案/指示器）。
    - 安装按钮调用 `window.openclaw.skills.install`，卸载按钮调用 `window.openclaw.skills.update({ enabled: false })`，成功后列表通过 `loadSkills()` 刷新。
    - 所有安装/卸载与保存 API key 的成功/失败都有 toast 结果反馈（不只 console.error）。
    - `cd client && npm run typecheck` 通过。
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/kaka/Desktop/synclaw/client && npm run typecheck</automated>
  </verify>
  <done>
    - SkillsPanel 组件具备技能市场所需的：卡片浏览（分类+搜索）、详情弹窗（描述+配置项）、安装/卸载闭环（加载态+toast+刷新）。
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire 技能市场入口 + 技能面板自动刷新</name>
  <files>client/src/renderer/components/SettingsView.tsx, client/src/renderer/components/CommandPalette.tsx</files>
  <read_first>
    - client/src/renderer/components/SettingsView.tsx (现有技能面板实现与导航 section/switch)
    - client/src/renderer/components/CommandPalette.tsx (handleSettings(section) 与已有 skills-panel command)
    - client/src/renderer/components/SkillsPanel.tsx (用于技能市场入口组件名/导出)
  </read_first>
  <action>
    1. 在 `SettingsView.tsx` 增加新的 Settings section：
       - 扩展 `type SettingsSection`：新增 `'skillsMarket'`。
       - 在 `NAV` 数组中添加一项：`{ id: 'skillsMarket', label: '技能市场', icon: BookOpen }`（使用已有导入的 `BookOpen` 图标，避免额外依赖）。
    2. 在 `SettingsView.tsx` 的 `content` `useMemo` switch 中新增 case：
       - case `'skillsMarket'`: 渲染技能市场组件：`<SkillsMarketPanel />`
       - 为避免与本文件内已有 `function SkillsPanel()` 冲突，在文件顶部添加 import 别名：
         `import { SkillsPanel as SkillsMarketPanel } from './SkillsPanel'`
    3. 更新当前 `SkillsPanel()`（技能面板）以满足闭环可见性：
       - 将加载结果映射中的 `badge` 语义改为安装状态：
         `s.enabled ? '已安装' : '未安装'`
       - 将 pill 文案与过滤逻辑与安装状态对齐：
         - `filter === 'installed'` -> `s.badge === '已安装'`
         - `filter === 'avail'` -> `s.badge === '未安装'`
         - （`paid` 保持原逻辑，不强制在本次提供积分/用量 API）
       - 将切换按钮文案改为安装/卸载：
         - 若 `s.badge === '已安装'`：按钮显示 `卸载`
         - 若 `s.badge === '未安装'`：按钮显示 `安装`
         - 并在按钮点击时仍使用现有 `window.openclaw.skills.update({ skillKey: s.name, enabled: ... })` 调用链（installed -> enabled false）。
       - 为技能面板增加自动刷新：
         - 在技能面板 `useEffect` 中新增 `window.openclaw.on()` 订阅，监听：
           - `event.event === 'skill:installed'`
           - `event.event === 'skill:status-changed'`
         - 触发时调用 `reloadSkills()`。
    4. 安装/卸载结果反馈：
       - 在技能面板 `toggleSkill()` 内增加 toast 反馈（成功：安装成功/卸载成功；失败：显示错误 toast）。
       - 从 `useToastStore` 读取 `addToast`，与本文件其他面板保持一致。
    5. 在 `CommandPalette.tsx` 增加技能市场入口命令：
       - 在已有 `'skills-panel'` 命令附近新增一个新 command：
         - id: `'skills-market-panel'`
         - label: `'技能市场'`
         - category: `'技能'`
         - action: `() => handleSettings('skillsMarket')`
  </action>
  <acceptance_criteria>
    - Settings 弹窗的导航中出现“技能市场”入口，点击后展示技能市场卡片列表。
    - CommandPalette 中存在“技能市场”命令，并可打开 Settings 的 skillsMarket section。
    - 当技能市场执行安装/卸载并触发 `skill:installed` 或 `skill:status-changed` 事件时，“技能”面板会自动调用 `reloadSkills()` 并更新列表内容。
    - “技能”面板列表中的状态标签显示“已安装/未安装”，按钮显示“卸载/安装”，语义与市场一致。
    - `cd client && npm run typecheck` 通过。
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/kaka/Desktop/synclaw/client && npm run typecheck</automated>
  </verify>
  <done>
    - 技能市场入口可达，且安装/卸载形成闭环：市场安装后技能面板自动刷新并展示已安装状态。
  </done>
</task>

</tasks>

<verification>
总体检查（目标可达性）：
- 打开 Settings → 技能市场：能看到分类+搜索+卡片列表
- 点击任意卡片：能打开详情弹窗（描述+API Key配置）
- 点击安装/卸载：按钮出现加载态，成功/失败有 toast，并且列表状态刷新
- 返回 Settings → 技能：安装后能自动刷新并显示已安装条目
</verification>

<success_criteria>
1. SkillsMarket 页面展示卡片列表，支持分类和搜索。
2. 点击技能卡片显示详情（描述、API Key 配置项）。
3. 技能安装/卸载有明确加载态与结果反馈（toast）。
4. 安装后技能出现在“技能”面板，并且该面板在 Gateway 事件驱动下自动刷新。
5. 列表中能清晰区分“已安装/未安装”。
</success_criteria>

<output>
After completion, create `.planning/phases/04-ui/04-SUMMARY.md`
</output>
# Phase 4: 技能市场 UI — 执行计划

**Phase:** 4  
**Created:** 2026-03-24  
**Status:** Ready for execution  
**Requirements addressed:** SKIL-01, SKIL-02, SKIL-03

---

## Context

- 当前代码已存在 `client/src/renderer/components/SkillsPanel.tsx`，但仍偏“骨架页”：
  - 交互流程未完整覆盖“列表→详情→安装/卸载→状态回流”闭环；
  - 分类、搜索、安装状态区分能力未完全对齐 Phase 4 成功标准；
  - 安装/卸载加载态、错误态反馈细节需增强。
- `window.openclaw.skills` 已暴露 `status/install/update` 能力，可作为 UI 层唯一数据通道。
- 本阶段重点是 **可视化技能市场体验完整化**，不新增后端服务。

---

## Plans

### Plan 01: 技能市场列表体验完善（卡片/分类/搜索/状态）

**Objective:** 完成技能市场核心浏览体验，满足 SKIL-01 与部分 SKIL-02 可见性要求。

**Requirements addressed:** SKIL-01, SKIL-02

```yaml
---
objective: 完善技能市场列表，支持分类、搜索、安装状态可视化
depends_on: []
wave: 1
autonomous: false
files_modified:
  - client/src/renderer/components/SkillsPanel.tsx
  - client/src/renderer/components/SettingsView.tsx
requirements:
  - SKIL-01
  - SKIL-02
---

<tasks>
  <task id="01-1">
    <read_first>
      client/src/renderer/components/SkillsPanel.tsx
      client/src/renderer/components/SettingsView.tsx
      client/src/renderer/components/Toast.tsx
    </read_first>
    <action>
      在 SkillsPanel 中建立标准化列表状态机：
      loading / ready / empty / error；并按技能对象计算 unified status（installed / not_installed / installing / uninstalling）。
      卡片区必须显示：技能名、描述、分类标签、安装状态徽标。
    </action>
    <acceptance_criteria>
      - SkillsPanel.tsx 中存在 loading/empty/error 三种可视分支
      - 技能卡片 UI 显示 category 与安装状态 badge
      - 搜索结果为 0 时展示空状态提示文案（非空白）
    </acceptance_criteria>
  </task>

  <task id="01-2">
    <read_first>
      client/src/renderer/components/SkillsPanel.tsx
    </read_first>
    <action>
      增加“分类筛选 + 文本搜索”双条件过滤：
      分类来源于 skills 数据动态聚合（含“全部”），搜索匹配 name/description/category。
      将过滤逻辑收敛到 useMemo，避免重复计算与渲染抖动。
    </action>
    <acceptance_criteria>
      - SkillsPanel.tsx 存在 categoryFilter 状态与 useMemo filteredSkills
      - filteredSkills 同时使用 category 与 query 两个条件
      - UI 存在“全部 + 动态分类项”筛选入口
    </acceptance_criteria>
  </task>

  <task id="01-3">
    <read_first>
      client/src/renderer/components/SkillsPanel.tsx
      client/src/renderer/components/Toast.tsx
    </read_first>
    <action>
      完善安装/卸载按钮反馈：
      - 点击后按钮进入 loading 态（禁用 + spinner）；
      - 成功提示“安装成功/卸载成功”；
      - 失败提示具体错误；
      - 操作后自动刷新技能列表与状态。
    </action>
    <acceptance_criteria>
      - 安装或卸载动作期间按钮 disabled 且出现 loading 文案/图标
      - 成功与失败均通过 toast 或等效提示呈现
      - 成功后列表状态发生更新（无需手动刷新页面）
    </acceptance_criteria>
  </task>
</tasks>
```

---

### Plan 02: 技能详情抽屉（描述/配置项/统计）+ 一键安装闭环

**Objective:** 提供技能详情视图与一键安装入口，完成 SKIL-03 并补齐 SKIL-02。

**Requirements addressed:** SKIL-02, SKIL-03

```yaml
---
objective: 实现技能详情抽屉与一键安装完整闭环
depends_on:
  - "01"
wave: 2
autonomous: false
files_modified:
  - client/src/renderer/components/SkillsPanel.tsx
  - client/src/renderer/types/electron.d.ts
requirements:
  - SKIL-02
  - SKIL-03
---

<tasks>
  <task id="02-1">
    <read_first>
      client/src/renderer/components/SkillsPanel.tsx
      client/src/renderer/types/electron.d.ts
    </read_first>
    <action>
      在 SkillsPanel 新增“详情抽屉/模态层”：
      点击技能卡片打开，展示：
      1) 描述（description）
      2) 配置项（若后端未返回则显示“暂无配置项”占位）
      3) 使用统计（若后端未返回则显示“暂无统计数据”占位）
      并在详情区保留主操作按钮（安装/卸载）。
    </action>
    <acceptance_criteria>
      - SkillsPanel.tsx 存在 selectedSkill 状态与详情抽屉渲染分支
      - 点击卡片可打开详情，关闭按钮可关闭详情
      - 详情内包含“描述 / 配置项 / 使用统计”三个区块标题
    </acceptance_criteria>
  </task>

  <task id="02-2">
    <read_first>
      client/src/renderer/components/SkillsPanel.tsx
      client/src/preload/index.ts
      client/src/main/ipc-handlers.ts
    </read_first>
    <action>
      打通“一键安装”主路径：
      - 列表页与详情页均提供 install action；
      - install 入参与现有 openclaw.skills.install 对齐；
      - 完成后立即刷新 status 并回填“已安装”状态；
      - 重复点击防抖（loading 时不可重复触发）。
    </action>
    <acceptance_criteria>
      - SkillsPanel.tsx 中 install handler 调用 window.openclaw.skills.install
      - install 成功后会调用列表刷新函数（如 loadSkills）
      - loading 期间二次点击不会触发第二次安装请求
    </acceptance_criteria>
  </task>
</tasks>
```

---

## Verification

### Build Verification

```bash
cd /Users/kaka/Desktop/synclaw/client
pnpm exec tsc --noEmit
pnpm build:renderer
```

### Functional Verification

1. 打开“技能市场”页面，可见卡片列表与分类筛选。  
2. 输入关键词后列表实时过滤，清空后恢复。  
3. 点击技能卡片可打开详情抽屉，看到描述/配置项/统计区块。  
4. 点击“安装”后有 loading 态，成功后状态变更为“已安装”。  
5. 对已安装技能执行卸载，有 loading 与结果反馈，状态回到“未安装”。  
6. 页面可清晰区分“已安装 / 未安装 / 操作中”。

---

## must_haves (Goal-Backward Verification)

| Criterion | Source |
|-----------|--------|
| 卡片式技能列表可浏览，支持分类和搜索 | SKIL-01 |
| 点击技能可进入详情，并展示描述/配置项/统计 | SKIL-03 |
| 一键安装后状态可回流到列表，且有反馈 | SKIL-02 |
| 安装/卸载过程有加载态和错误提示 | SKIL-02 |
| 列表中状态区分清晰（已安装/未安装） | SKIL-02 |
| TypeScript 与 renderer 构建通过 | Phase 4 Success Criteria |

---

## Dependencies & Waves

- **Wave 1:** Plan 01（列表与交互基建）
- **Wave 2:** Plan 02（详情抽屉 + 一键安装闭环，依赖 Wave 1）

---

*Plans: 2 | Waves: 2 | Created: 2026-03-24*

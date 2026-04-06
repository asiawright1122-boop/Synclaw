---
gsd_plan_version: 1.0
phase: 25
phase_name: IM 频道管理 UI 精简
goal: 移除 IM 面板中的占位 UI 和视觉噪音，修正误导文字，使用紧凑行布局
depends_on: []
files_modified:
  - client/src/renderer/components/IMPanel.tsx
autonomous: true
requirements: [IM-01, IM-02, IM-03, IM-04]
---

## Phase 25 — IM 频道管理 UI 精简

### Context

`IMPanel.tsx` 当前存在以下问题：
1. 频道卡片中包含一个永远禁用的"编辑"按钮（tooltip: "配置编辑功能开发中"），属于占位 UI，应删除
2. 平台选择器按钮同时显示图标、名称和长描述文字（`meta.desc`），过于拥挤，描述应默认隐藏，hover 时通过 tooltip 显示
3. 空状态按钮文字是"开始新对话"，用户来到 IM 面板的目的是添加频道，应改为"添加第一个频道"
4. 频道列表使用全宽 Card 布局，垂直空间消耗大，应改为紧凑行布局

项目中没有现成的 Tooltip 组件。将使用原生 `title` 属性实现 hover 提示（`title` 属性在浏览器中原生支持 tooltip，无需引入额外依赖）。

---

## Wave 1 — 独立修改（可并行执行）

### Task 1.1 — 删除频道卡片中的"编辑"占位按钮

**requirement:** IM-01

<read_first>
- `client/src/renderer/components/IMPanel.tsx`
</read_first>

<action>

在 `IMPanel.tsx` 第 274-279 行找到并删除以下代码：

```tsx
<button type="button" className={`${pillBtn(false)} text-xs`}
  style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
  onClick={() => addToast({ type: 'info', message: '配置编辑功能开发中', duration: 2000 })}>
  编辑
</button>
```

删除后，频道卡片右侧只保留"断开"按钮，整体保持 `<div className="flex gap-1 shrink-0">` 包裹。
</action>

<acceptance_criteria>
- [ ] `grep -n "配置编辑功能开发中" client/src/renderer/components/IMPanel.tsx` 返回空（无匹配）
- [ ] `grep -n "编辑" client/src/renderer/components/IMPanel.tsx` 返回空（频道卡片中已无编辑按钮）
- [ ] 文件语法正确：`npx tsc --noEmit client/src/renderer/components/IMPanel.tsx` 无错误
</acceptance_criteria>

---

### Task 1.2 — 平台选择器默认隐藏 desc，hover 显示 tooltip

**requirement:** IM-02

<read_first>
- `client/src/renderer/components/IMPanel.tsx`
</read_first>

<action>

在 `IMPanel.tsx` 第 189-204 行的平台选择器按钮区域，找到：

```tsx
<button key={key} type="button" onClick={() => setAddingType(key)} className="text-left px-4 py-3 rounded-[10px] border transition-all"
  style={{
    borderColor: addingType === key ? meta.color : 'var(--border)',
    background: addingType === key ? `${meta.color}10` : 'var(--bg-subtle)',
  }}>
  <div className="flex items-center gap-2 mb-1">
    <span className="text-lg">{meta.icon}</span>
    <span className="text-sm font-semibold" style={{ color: addingType === key ? meta.color : 'var(--text)' }}>{meta.label}</span>
    {addingType === key && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: meta.color, color: '#fff' }}>已选择</span>}
  </div>
  <p className="text-xs" style={{ color: 'var(--text-sec)' }}>{meta.desc}</p>
</button>
```

替换为：

```tsx
<button key={key} type="button" onClick={() => setAddingType(key)} className="text-left px-4 py-3 rounded-[10px] border transition-all"
  style={{
    borderColor: addingType === key ? meta.color : 'var(--border)',
    background: addingType === key ? `${meta.color}10` : 'var(--bg-subtle)',
  }}
  title={meta.desc}>
  <div className="flex items-center gap-2">
    <span className="text-lg">{meta.icon}</span>
    <span className="text-sm font-semibold" style={{ color: addingType === key ? meta.color : 'var(--text)' }}>{meta.label}</span>
    {addingType === key && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: meta.color, color: '#fff' }}>已选择</span>}
  </div>
</button>
```

改动说明：
- 添加 `title={meta.desc}` 属性到 button 元素，实现 hover tooltip
- 删除 `<p className="text-xs" style={{ color: 'var(--text-sec)' }}>{meta.desc}</p>` 这行
- 删除 `mb-1` class（因为不再有下方的描述文字）
</action>

<acceptance_criteria>
- [ ] 平台选择器按钮中不包含 `{meta.desc}` 文字节点（`grep -n "meta.desc" client/src/renderer/components/IMPanel.tsx` 只在 `<div className="flex items-center` 行之前出现一次，不在 p 标签中）
- [ ] 每个平台 button 元素有 `title={meta.desc}` 属性
- [ ] 文件语法正确：`npx tsc --noEmit client/src/renderer/components/IMPanel.tsx` 无错误
</acceptance_criteria>

---

### Task 1.3 — 空状态按钮文字改为"添加第一个频道"

**requirement:** IM-03

<read_first>
- `client/src/renderer/components/IMPanel.tsx`
</read_first>

<action>

在 `IMPanel.tsx` 第 296-299 行找到：

```tsx
<button type="button" className={pillBtn(true)} style={{ background: 'var(--accent1)' }}
  onClick={() => setShowAddForm(true)}>
  开始新对话
</button>
```

将 `开始新对话` 替换为 `添加第一个频道`。
</action>

<acceptance_criteria>
- [ ] `grep -n "添加第一个频道" client/src/renderer/components/IMPanel.tsx` 返回匹配行
- [ ] `grep -n "开始新对话" client/src/renderer/components/IMPanel.tsx` 返回空（无匹配）
- [ ] 文件语法正确：`npx tsc --noEmit client/src/renderer/components/IMPanel.tsx` 无错误
</acceptance_criteria>

---

## Wave 2 — 布局重构（在 Task 1.1 后执行）

### Task 2.1 — 频道列表从 Card 改为紧凑行布局

**requirement:** IM-04

<read_first>
- `client/src/renderer/components/IMPanel.tsx`
- `client/src/renderer/components/ui/index.tsx` （参考 Row 组件样式）
</read_first>

<action>

在 `IMPanel.tsx` 第 245-292 行的频道列表区域，找到：

```tsx
{channels.length > 0 && (
  <div className="space-y-3">
    {channels.map((ch) => {
      const id = ch.id || ch.channel || ch.platform || ''
      const meta = getMeta(ch.platform || ch.channel)
      return (
        <Card key={id}>
          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shrink-0"
                style={{ background: `${meta.color}15` }}>{meta.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{ch.name || meta.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                  {ch.enabled !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: ch.enabled ? 'rgba(47,158,91,0.15)' : 'rgba(0,0,0,0.06)', color: ch.enabled ? 'var(--success)' : 'var(--text-ter)' }}>
                      {ch.enabled ? '已启用' : '已禁用'}
                    </span>
                  )}
                  {ch.status && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                      {ch.status}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-sec)' }}>{ch.description || meta.desc}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button type="button" className={`${pillBtn(false)} text-xs`}
                  style={{ borderColor: 'var(--border)', color: 'var(--text-sec)' }}
                  onClick={() => addToast({ type: 'info', message: '配置编辑功能开发中', duration: 2000 })}>
                  编辑
                </button>
                <button type="button" className={`${pillBtn(false)} text-xs`}
                  style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  onClick={() => handleDisconnect(ch)} disabled={disconnectingId === id}>
                  {disconnectingId === id ? <Spinner size={12} /> : '断开'}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )
    })}
  </div>
)}
```

替换为（注意：编辑按钮已在 Task 1.1 中删除，下方代码不包含编辑按钮）：

```tsx
{channels.length > 0 && (
  <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
    {channels.map((ch, idx) => {
      const id = ch.id || ch.channel || ch.platform || ''
      const meta = getMeta(ch.platform || ch.channel)
      return (
        <div
          key={id}
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: idx < channels.length - 1 ? '1px solid var(--border)' : undefined }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
            style={{ background: `${meta.color}15` }}>{meta.icon}</div>
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ch.name || meta.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
            {ch.enabled !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: ch.enabled ? 'rgba(47,158,91,0.15)' : 'rgba(0,0,0,0.06)', color: ch.enabled ? 'var(--success)' : 'var(--text-ter)' }}>
                {ch.enabled ? '已启用' : '已禁用'}
              </span>
            )}
            {ch.status && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                {ch.status}
              </span>
            )}
          </div>
          <button type="button" className={`${pillBtn(false)} text-xs shrink-0`}
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={() => handleDisconnect(ch)} disabled={disconnectingId === id}>
            {disconnectingId === id ? <Spinner size={12} /> : '断开'}
          </button>
        </div>
      )
    })}
  </div>
)}
```

改动说明：
- 外层容器从 `<Card className="mb-6">` 改为手写 `rounded-[10px] border overflow-hidden`（无背景色，更紧凑）
- 每个频道从独立 `<Card key={id}>` 改为行内 `<div className="flex items-center gap-3 px-4 py-3">`
- 频道图标从 `w-9 h-9 text-xl` 缩小为 `w-8 h-8 text-base`
- `flex items-start gap-3` 改为 `flex items-center gap-3`（垂直居中对齐）
- 频道名称从 `text-sm font-semibold` 改为 `text-sm font-medium`（减弱视觉层级）
- 删除 description 段落（`{ch.description || meta.desc}`），紧凑行布局不需要
- 删除编辑按钮（Task 1.1 已移除）
- "断开"按钮从 `shrink-0` 改为 `shrink-0`（保持），并在左侧加上 `flex-1` 的容器
- 行间分隔使用 `border-bottom`（通过判断 `idx < channels.length - 1` 避免最后一行多余 border）
</action>

<acceptance_criteria>
- [ ] `grep -n "Card key={id}" client/src/renderer/components/IMPanel.tsx` 返回空（不再使用 Card 包裹频道行）
- [ ] 频道行使用 `<div className="flex items-center gap-3 px-4 py-3">` 结构
- [ ] 行间分隔使用 `border-bottom` 判断（`idx < channels.length - 1`）
- [ ] 文件语法正确：`npx tsc --noEmit client/src/renderer/components/IMPanel.tsx` 无错误
- [ ] 频道图标尺寸为 `w-8 h-8 text-base`
- [ ] description 文字 `{ch.description || meta.desc}` 已从频道行中移除
</acceptance_criteria>

---

## Verification

| Criterion | Check |
|-----------|-------|
| "编辑"按钮已删除 | `grep "配置编辑功能开发中" client/src/renderer/components/IMPanel.tsx` → 无输出 |
| 平台按钮无 desc 文字，有 title 属性 | `grep -A2 "title={meta.desc}" client/src/renderer/components/IMPanel.tsx` → 有输出 |
| 空状态按钮文字正确 | `grep "添加第一个频道" client/src/renderer/components/IMPanel.tsx` → 有输出 |
| 频道行不使用 Card 组件 | `grep "<Card key={id}>" client/src/renderer/components/IMPanel.tsx` → 无输出 |
| TypeScript 编译通过 | `npx tsc --noEmit client/src/renderer/components/IMPanel.tsx` → 无错误 |

---

## must_haves (goal-backward)

| # | Must have | Verification |
|---|-----------|-------------|
| 1 | 频道卡片中无"编辑"按钮 | grep 无匹配 |
| 2 | 平台选择器默认隐藏 desc，有 hover tooltip | title 属性存在，无 p 标签渲染 desc |
| 3 | 空状态按钮显示"添加第一个频道" | grep 有匹配 |
| 4 | 频道列表为紧凑行布局，无 Card 包裹，无 description 行 | grep 验证结构 |

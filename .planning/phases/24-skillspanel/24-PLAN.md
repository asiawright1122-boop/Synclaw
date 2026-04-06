---
gsd_plan_version: 1.0
phase: 24
title: SkillsPanel 安装进度
wave: 1
depends_on: []
files_modified:
  - client/src/renderer/components/settings/SkillsPanel.tsx
autonomous: false
requirements:
  - SKL-01
  - SKL-02
  - SKL-03
---

## Phase Goal

SkillsPanel 安装过程中显示实时进度条，替代原来无反馈的静默等待。

## Success Criteria

1. SkillsPanel 监听 `skill:progress` 或 `skill:status-changed` 事件，更新安装状态
2. 正在安装的 skill 在列表中显示内联进度条（progress bar + status message）
3. 安装完成后进度条消失或变为已启用状态；安装失败显示错误 toast

---

## Task 1 — 扩展 SkillItem 接口并添加安装状态 state

**requirements:** SKL-01, SKL-02, SKL-03

<read_first>
client/src/renderer/components/settings/SkillsPanel.tsx
</read_first>

<action>

在 `SkillsPanel.tsx` 中：

1. 在文件顶部（import 区域后）添加 `Loader2` import：

```typescript
import { ..., Loader2 } from 'lucide-react'
```

2. 在 `SkillItem` interface 末尾添加安装状态字段：

```typescript
interface SkillItem {
  name: string
  badge: string
  desc: string
  warn: string | null
  installing?: boolean
  installProgress?: number    // 0–100
  installMessage?: string      // e.g. "下载中...", "配置中..."
}
```

3. 在 `SkillsPanel` 函数组件中，在现有 `toggling` state 声明后添加安装进度 state：

```typescript
const [toggling, setToggling] = useState<string | null>(null)
// 新增：skillKey → 安装进度信息
const [installingSkills, setInstallingSkills] = useState<Record<string, { progress?: number; message?: string }>>({})
```

4. 在 `filteredSkills` 计算逻辑中，将 `installingSkills` 中的进度信息 merge 进 skills 列表。找到 `filteredSkills` 的定义（约第158行），改为：

```typescript
const filteredSkills = skills.filter((s) => {
  if (filter === 'installed') return s.badge === '已启用'
  if (filter === 'avail') return s.badge === '已禁用'
  if (filter === 'paid') return s.warn !== null
  return true
}).map((s) => ({
  ...s,
  installing: !!installingSkills[s.name],
  installProgress: installingSkills[s.name]?.progress,
  installMessage: installingSkills[s.name]?.message,
}))
```

5. 修改 `filter === 'avail'` 过滤条件，使其也包含正在安装中的 skill（因为安装中的 skill 原本不在列表中），在 filter 条件中加入 `|| s.installing`。
</action>

<acceptance_criteria>

- [ ] `Loader2` imported from `lucide-react`
- [ ] `SkillItem` interface includes `installing?: boolean`, `installProgress?: number`, `installMessage?: string`
- [ ] `installingSkills` state declared as `useState<Record<string, { progress?: number; message?: string }>>({})`
- [ ] `filteredSkills` maps each skill and includes the 3 new fields from `installingSkills` lookup
- [ ] Avail filter includes `s.installing` so installing skills appear in "可用" tab

</acceptance_criteria>

---

## Task 2 — 实现事件监听器处理安装进度

**requirements:** SKL-01, SKL-02, SKL-03

<read_first>
client/src/renderer/components/settings/SkillsPanel.tsx
</read_first>

<action>

在 `SkillsPanel.tsx` 的 `useEffect` 中（`window.openclaw.on` 订阅块附近，约第146–155行），添加以下逻辑：

1. 在 `unsub` 返回函数之前，添加一个 `installUnsub` 来监听 `skill:progress` 事件。`skill:progress` 的 payload 预期为 `{ skillKey: string; progress?: number; message?: string }`：

```typescript
const installUnsub = window.openclaw.on((e) => {
  if (e.event === 'skill:progress') {
    const payload = e.data as { skillKey?: string; progress?: number; message?: string }
    if (payload?.skillKey) {
      setInstallingSkills((prev) => ({
        ...prev,
        [payload.skillKey]: {
          progress: payload.progress,
          message: payload.message,
        },
      }))
    }
  }
  if (e.event === 'skill:installed') {
    // 安装完成：从 installingSkills 中移除，触发列表刷新
    const payload = e.data as { skillKey?: string }
    if (payload?.skillKey) {
      setInstallingSkills((prev) => {
        const next = { ...prev }
        delete next[payload.skillKey]
        return next
      })
      reloadSkills()
    }
  }
  if (e.event === 'skill:status-changed') {
    // 状态变化：移除安装状态并刷新
    const payload = e.data as { skillKey?: string }
    if (payload?.skillKey) {
      setInstallingSkills((prev) => {
        const next = { ...prev }
        delete next[payload.skillKey]
        return next
      })
      reloadSkills()
    }
  }
})
```

2. 在 `unsub` 变量声明后，也保存 `installUnsub` 的引用，使 cleanup 函数能同时调用两者：

找到：
```typescript
    const unsub = window.openclaw.on((e) => {
      if (e.event === 'skill:installed' || e.event === 'skill:status-changed') {
        reloadSkills()
      }
    })

    return () => {
      cancelled = true
      unsub?.()
    }
```

替换为：
```typescript
    const unsub = window.openclaw.on((e) => {
      if (e.event === 'skill:installed' || e.event === 'skill:status-changed') {
        reloadSkills()
      }
    })

    return () => {
      cancelled = true
      unsub?.()
      installUnsub?.()
    }
```

3. 同时，将原来的 `skill:status-changed` 监听器中的 `reloadSkills()` 改为也清理 `installingSkills`：

在原来 `skill:status-changed` 的处理块中，更新为：
```typescript
if (e.event === 'skill:status-changed') {
  const payload = e.data as { skillKey?: string }
  if (payload?.skillKey) {
    setInstallingSkills((prev) => {
      const next = { ...prev }
      delete next[payload.skillKey]
      return next
    })
    reloadSkills()
  }
}
```

</action>

<acceptance_criteria>

- [ ] `skill:progress` listener added that extracts `skillKey`, `progress`, `message` from `e.data`
- [ ] `skill:progress` handler calls `setInstallingSkills` to update progress for the matching skill
- [ ] `skill:installed` listener removes the skill from `installingSkills` and calls `reloadSkills()`
- [ ] `skill:status-changed` listener removes the skill from `installingSkills` and calls `reloadSkills()`
- [ ] `installUnsub` reference saved and called in cleanup function alongside `unsub`
- [ ] No `any` types used — all event data properly typed

</acceptance_criteria>

---

## Task 3 — 渲染内联进度条 UI

**requirements:** SKL-02, SKL-03

<read_first>
client/src/renderer/components/settings/SkillsPanel.tsx
</read_first>

<action>

在 `SkillsPanel.tsx` 的渲染部分，找到 skills 列表 map 的每一项渲染（约第216–251行 `filteredSkills.map((s) => ...`）。

在 `<Card>` 组件内部，在 `</div>` 关闭标签之前（`{/* description */}` 那段之后，`{/* warn */}` 那段之后），添加以下进度条渲染逻辑：

```tsx
                  {/* 安装进度条 */}
                  {s.installing ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--accent1)' }}>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {s.installMessage ?? '安装中...'}
                        </span>
                        {s.installProgress !== undefined && (
                          <span className="text-[10px]" style={{ color: 'var(--text-ter)' }}>
                            {s.installProgress}%
                          </span>
                        )}
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'var(--bg-elevated)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${s.installProgress ?? 0}%`,
                            background: 'var(--accent1)',
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
```

同时，将原有的 `{/* warn */}` 块和进度条的位置调整一下——warn 信息应该和进度条共享同一行区域，可以把 warn 移到进度条外层 div 之外：

找到当前 warn 渲染块（约第234–238行）：
```tsx
                  {s.warn ? (
                    <p className="text-xs mt-2" style={{ color: 'var(--accent1)' }}>
                      {s.warn}
                    </p>
                  ) : null}
```

保持不变，因为 warn 始终显示（安装中或非安装中）。

进度条应该出现在 warn 下方、按钮上方，所以在 Card 内部结构调整为：

```
<div className="px-4 py-4 flex gap-4 items-start">
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 flex-wrap">
      ... name + badge ...
    </div>
    <p className="text-xs mt-2 ...">desc</p>
    {/* 进度条（安装中时） */}
    {s.installing ? (...) : null}
    {/* warn */}
    {s.warn ? (...) : null}
  </div>
  <button>启用/禁用</button>
</div>
```

如果安装中的 skill 同时有 warn 信息，warn 仍然显示在进度条下方。
</action>

<acceptance_criteria>

- [ ] Progress bar renders inside each skill Card/row when `s.installing === true`
- [ ] `Loader2` spinner icon shown with status message text
- [ ] Progress bar fills left-to-right proportional to `s.installProgress` (defaults to 0% if undefined)
- [ ] Progress percentage text shown when `s.installProgress !== undefined`
- [ ] Bar disappears (replaced by normal badge) when `s.installing === false`
- [ ] No layout break when warn + installing coexist

</acceptance_criteria>

---

## Task 4 — 添加安装失败错误处理

**requirements:** SKL-01, SKL-03

<read_first>
client/src/renderer/components/settings/SkillsPanel.tsx
</read_first>

<action>

在 `SkillsPanel.tsx` 的 `useEffect` 事件监听器中（Task 2 添加的 installUnsub 内部），添加 `skill:error` 事件处理：

在 `installUnsub` 的 `if` 分支末尾（`skill:status-changed` 块之后，`}` 之前），添加：

```typescript
  if (e.event === 'skill:error') {
    const payload = e.data as { skillKey?: string; error?: string }
    if (payload?.skillKey) {
      setInstallingSkills((prev) => {
        const next = { ...prev }
        delete next[payload.skillKey]
        return next
      })
      addToast({
        type: 'error',
        message: `"${payload.skillKey}" 安装失败${payload.error ? `：${payload.error}` : ''}`,
        duration: 4000,
      })
    }
  }
```

注意：`addToast` 已经在组件顶部通过 `useToastStore` 获取（第44行），可以直接使用。
</action>

<acceptance_criteria>

- [ ] `skill:error` event listener added in installUnsub
- [ ] Error handler extracts `skillKey` and `error` from `e.data`
- [ ] On error: skill removed from `installingSkills`, error toast shown via `addToast()`
- [ ] Toast message includes skill name and error details if available
- [ ] Toast duration set to 4000ms so user has time to read

</acceptance_criteria>

---

## Verification

### 手动验证步骤

1. 启动 SynClaw dev server (`npm run dev` in `client/`)
2. 打开浏览器 DevTools Console
3. 在 Console 中模拟 `skill:progress` 事件：

```javascript
window.openclaw?._emit?.('skill:progress', { skillKey: 'github', progress: 30, message: '下载中...' })
window.openclaw?._emit?.('skill:progress', { skillKey: 'github', progress: 60, message: '配置中...' })
window.openclaw?._emit?.('skill:progress', { skillKey: 'github', progress: 100, message: '完成' })
```

4. 验证 SkillsPanel 列表中 "github" 项显示进度条（需配合 Gateway 实际发送事件，或手动触发）
5. 模拟安装完成：

```javascript
window.openclaw?._emit?.('skill:installed', { skillKey: 'github' })
```

6. 验证进度条消失，skill 状态变为 "已安装" 或对应 badge
7. 模拟安装失败：

```javascript
window.openclaw?._emit?.('skill:error', { skillKey: 'github', error: '网络连接失败' })
```

8. 验证错误 toast 弹出，且 skill 不再显示进度条

### Grep 验证

```bash
# Task 1
grep -n "installingSkills\|installProgress\|installMessage" client/src/renderer/components/settings/SkillsPanel.tsx

# Task 2
grep -n "skill:progress\|skill:error\|installUnsub" client/src/renderer/components/settings/SkillsPanel.tsx

# Task 3
grep -n "Loader2.*animate-spin\|progress.*%\|w-full.*rounded-full" client/src/renderer/components/settings/SkillsPanel.tsx

# Task 4
grep -n "skill:error\|addToast" client/src/renderer/components/settings/SkillsPanel.tsx
```

### must_haves（goal-backward verification）

- [ ] SkillsPanel listens for `skill:progress` event → progress bar appears and updates
- [ ] Inline progress bar + status message shown inside skill list item (not modal/overlay)
- [ ] `skill:installed` → progress bar replaced by normal badge
- [ ] `skill:error` → error toast shown, progress bar removed
- [ ] No `any` types in event handlers (proper typing on all `e.data`)

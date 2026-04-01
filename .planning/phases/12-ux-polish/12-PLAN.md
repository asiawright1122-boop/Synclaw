# Phase 12 — UX-POLISH

**Goal:** Provide guidance UI for all empty states, loading feedback, and keyboard shortcuts.

**Requirements:** UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09

---

## Analysis

### Existing Components vs Requirements

| Component | Requirement | Status | Gap |
|-----------|------------|--------|-----|
| `TaskBoard` | UX-01: "开启你的第一个任务" + create CTA | Compact: "暂无任务" text only; Full view: columns with no empty state | Need title + CTA in both views |
| `IMPanel` | UX-02: "开始新对话" guide + CTA | Has "尚未添加 IM 频道" + "添加第一个频道" button | Text mismatch, CTA already exists |
| `AvatarListPanel` | UX-03: 5 template quick-create buttons | Has "添加分身" button, no templates | Need 5 template buttons |
| `McpPanel` | UX-04: setup guide + quick template entry | Has QUICK_TEMPLATES defined but not shown when empty | Need empty state with template grid |
| `ChatView` | UX-05: skeleton loading animation | No skeleton | Need animated skeleton while sending |
| `App.tsx` shortcuts | UX-06: Cmd+, → settings | Not implemented | Add handler |
| `App.tsx` shortcuts | UX-07: Escape → LIFO close | Not implemented | Add LIFO modal stack |
| `App.tsx` shortcuts | UX-08: Cmd+Shift+S → sidebar | Not implemented | Add handler |
| `App.tsx` shortcuts | UX-09: Cmd+/ → shortcuts modal | Not implemented | Add modal + handler |

---

## Tasks

### 1. TaskBoard empty state — UX-01
- **File:** `client/src/renderer/components/TaskBoard.tsx`
- Compact view: replace "暂无任务" text with "开启你的第一个任务" heading + `Plus` icon CTA button that triggers `setShowNewTaskInput(true)`
- Full view (no tasks at all): show centered empty state with ClawLogo, "开启你的第一个任务" title, and create button CTA

### 2. IMPanel empty state text — UX-02
- **File:** `client/src/renderer/components/IMPanel.tsx`
- Change empty state heading from "尚未添加 IM 频道" to "开始新对话" and subtext to "连接 IM 渠道，随时随地与 SynClaw 对话"
- Keep the "添加第一个频道" button (CTA already correct)

### 3. AvatarListPanel template quick-create — UX-03
- **File:** `client/src/renderer/components/AvatarListPanel.tsx`
- When `filteredAvatars.length === 0 && !search`, replace the single "添加分身" button with a grid of **5 built-in template cards**:
  - `assistant`: "智能助手" — emoji 🤖, personality: "专业、乐于助人"
  - `coder`: "代码助手" — emoji 💻, personality: "精通技术、简洁高效"
  - `writer`: "写作助手" — emoji ✍️, personality: "善于表达、创意丰富"
  - `analyst`: "分析师" — emoji 📊, personality: "逻辑严谨、数据驱动"
  - `teacher`: "教学助手" — emoji 🎓, personality: "耐心讲解、循循善诱"
- Each card: emoji + name + description + "使用模板" button → `handleCreate()` with pre-filled template data

### 4. McpPanel empty state — UX-04
- **File:** `client/src/renderer/components/settings/McpPanel.tsx`
- When servers list is empty, show centered empty state with:
  - Heading: "配置你的第一个 MCP 服务"
  - Subtext: "MCP 服务扩展 SynClaw 的能力，访问文件、搜索、数据库等"
  - **Quick templates grid** using the existing `QUICK_TEMPLATES` constant (filesystem, brave-search, sqlite, github, slack)
  - Each template: icon + name + description + "快速添加" button

### 5. ChatView skeleton loading — UX-05
- **File:** `client/src/renderer/components/ChatView.tsx`
- When `sending === true`, render above the input area (inside the messages div, after the message list):
  - 1 user skeleton bubble (right-aligned, accent background)
  - 2–3 assistant skeleton bubbles (left-aligned, elevated background)
  - Each bubble: animated shimmer using CSS gradient animation (`background: linear-gradient(90deg, ...)` with `background-size: 200%` animated via `@keyframes`)
  - Use framer-motion `motion.div` with `animate` for shimmer
  - Do NOT block the input area — skeleton goes inside the scrollable messages div

### 6. Cmd+, shortcut — UX-06
- **File:** `client/src/renderer/App.tsx`
- Add to existing keyboard effect (line 57–70):
  ```typescript
  if ((e.metaKey || e.ctrlKey) && e.key === ',') {
    e.preventDefault()
    setSettingsModalOpen(true)
  }
  ```

### 7. Escape LIFO stack — UX-07
- **File:** `client/src/renderer/App.tsx`
- Track open modal stack as a state: `const [modalStack, setModalStack] = useState<string[]>([])`
- Register modals when they open: push their ID to stack
- Escape handler: pop topmost from stack, close that modal
- Order: CommandPalette → GlobalSearch → SettingsView → ExecApprovalModal
- For SettingsView: also track which section is open (nested close)

### 8. Cmd+Shift+S sidebar toggle — UX-08
- **File:** `client/src/renderer/App.tsx`
- Add to keyboard effect:
  ```typescript
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault()
    setSidebarCollapsed(v => !v)
  }
  ```
- Note: `setSidebarCollapsed` lives in `appStore` — verify it exists, add if not

### 9. Cmd+/ shortcuts modal — UX-09
- **File:** `client/src/renderer/App.tsx`
- Create `ShortcutsModal` component: centered overlay with a table of all shortcuts:
  - `Cmd+,` — 打开设置
  - `Cmd+K` — 命令面板
  - `Cmd+Shift+F` — 全局搜索
  - `Cmd+Shift+S` — 收起/展开侧栏
  - `Cmd+/` — 快捷键参考
  - `Escape` — 关闭弹窗
  - `Enter` — 发送消息
  - `Shift+Enter` — 换行
- Add handler:
  ```typescript
  if ((e.metaKey || e.ctrlKey) && e.key === '/') {
    e.preventDefault()
    setShortcutsModalOpen(v => !v)
  }
  ```

---

## Verification

After all tasks, confirm:

1. `pnpm test` (Vitest unit tests) still pass
2. Open app — TaskBoard in sidebar shows "开启你的第一个任务" when empty
3. Open app — IMPanel shows "开始新对话" empty state
4. Open app — AvatarListPanel shows 5 template quick-create cards when empty
5. Open app — McpPanel shows quick template grid when empty
6. Send a message in ChatView — skeleton animation appears above input
7. Press Cmd+, — settings modal opens
8. Press Escape — closes topmost modal
9. Press Cmd+Shift+S — sidebar collapses/expands
10. Press Cmd+/ — shortcuts modal opens

---

## Risks & Notes

- **UX-07 (Escape LIFO)**: The current modal system uses individual `isOpen` states. Need to refactor to a stack. Keep it simple: only close one modal at a time (topmost).
- **UX-05 (Skeleton)**: Must not break existing message rendering. Skeleton goes inside `AnimatePresence` with the message list, not replacing it.
- **Sidebar collapsed state**: `appStore` may not have `setSidebarCollapsed`. Add it as a new store action if missing.
- **UX-09**: ShortcutsModal should be a simple component, no external dependencies.

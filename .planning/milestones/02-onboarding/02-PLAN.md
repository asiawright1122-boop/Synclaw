# Phase 2: 首次启动引导 - Plans

**Created:** 2026-03-24
**Wave:** 1

---

## 01 - settingsStore 引导状态扩展

**Objective:** 在 `settingsStore` 中添加引导相关字段（`hasCompletedOnboarding` 和 `authorizedDirs`），支持引导状态检测和持久化。

**Requirements addressed:** ONBD-03

**Wave:** 1

**Files modified:**
- `client/src/renderer/stores/settingsStore.ts`
- `client/src/renderer/types/electron.d.ts`（如需要新类型）

---

```yaml
---
objective: 添加引导状态到 settingsStore，支持 hasCompletedOnboarding 和 authorizedDirs 持久化
depends_on: []
autonomous: false
---

<read_first>
client/src/renderer/stores/settingsStore.ts
client/src/preload/index.ts
</read_first>

<acceptance_criteria>
- grep "hasCompletedOnboarding" client/src/renderer/stores/settingsStore.ts | grep -q "hasCompletedOnboarding"
- grep "authorizedDirs" client/src/renderer/stores/settingsStore.ts | grep -q "authorizedDirs"
- grep "setHasCompletedOnboarding" client/src/renderer/stores/settingsStore.ts | grep -q "setHasCompletedOnboarding"
- cd client && pnpm exec tsc --noEmit 2>&1 | grep -v "^$" | tail -5
</acceptance_criteria>

<action>
修改 client/src/renderer/stores/settingsStore.ts：

1. 在 SettingsState 接口中添加：
   hasCompletedOnboarding: boolean
   authorizedDirs: string[]
   setHasCompletedOnboarding: (value: boolean) => void
   setAuthorizedDirs: (dirs: string[]) => void

2. 在 defaultSettings 中添加：
   hasCompletedOnboarding: false,
   authorizedDirs: [],

3. 在 loadSettings() 的 set() 调用中补充：
   hasCompletedOnboarding: res.data.hasCompletedOnboarding ?? false,
   authorizedDirs: Array.isArray(res.data.authorizedDirs) ? res.data.authorizedDirs : [],

4. 添加实现：
   setHasCompletedOnboarding: async (value) => {
     set({ hasCompletedOnboarding: value })
     await window.openclaw?.settings.set('hasCompletedOnboarding', value)
   },
   setAuthorizedDirs: async (dirs) => {
     set({ authorizedDirs: dirs })
     await window.openclaw?.settings.set('authorizedDirs', dirs)
   },

5. 在 resetSettings() 的 set() 中补充默认值：hasCompletedOnboarding: false, authorizedDirs: [],
</action>
```

---

## 02 - OnboardingView 组件实现

**Objective:** 创建三步骤引导界面组件（API Key 配置 → 授权目录选择 → 完成），使用 Framer Motion 动画，风格与现有 UI 一致。

**Requirements addressed:** ONBD-01, ONBD-02

**Wave:** 1

**Files created:**
- `client/src/renderer/components/OnboardingView.tsx`

---

```yaml
---
objective: 创建三步骤引导界面组件 OnboardingView
depends_on: ["01"]
autonomous: false
---

<read_first>
client/src/renderer/components/SettingsView.tsx
client/src/renderer/components/Toast.tsx
client/src/renderer/styles/globals.css
</read_first>

<acceptance_criteria>
- grep "OnboardingView" client/src/renderer/components/OnboardingView.tsx | grep -q "OnboardingView"
- grep "Step 1\|Step 2\|Step 3" client/src/renderer/components/OnboardingView.tsx | wc -l >= 3
- grep "Framer\|motion\|AnimatePresence" client/src/renderer/components/OnboardingView.tsx | grep -q "motion\|AnimatePresence"
- cd client && pnpm exec tsc --noEmit 2>&1 | grep -v "^$" | tail -3
</acceptance_criteria>

<action>
在 client/src/renderer/components/OnboardingView.tsx 中实现：

整体布局：
- 全屏 overlay，z-index 999，不阻止窗口交互
- 居中卡片：max-w 520px，bg-container，圆角 16px，shadow-xl
- 顶部 SynClaw Logo + "开始设置" 标题
- 底部进度指示器：3 个圆点，当前高亮（accent 色）

Step 1 — API Key 配置：
- 说明文本："SynClaw 使用你的 Claude API Key 来驱动 AI 对话。你可以从 Anthropic 官网获取免费额度。"
- 输入框 type="password"，placeholder="sk-ant-..."，前缀图标
- "跳过"文字链接（跳过时 hasCompletedOnboarding 仍设为 true）
- "继续" 按钮（primary gradient 样式）
- 验证：输入非空且以 sk-ant- 开头时启用"继续"

Step 2 — 授权目录：
- 说明文本："选择 SynClaw 可以访问的本地文件夹。所有文件操作都在这些目录中进行，确保隐私安全。"
- "添加文件夹" 按钮，调用 window.electronAPI.dialog.selectDirectory()
- 已选路径列表：每项显示路径 + 移除按钮
- "完成设置" 按钮

Step 3 — 完成：
- 大勾图标动画（Framer Motion scale + opacity）
- "开始使用 SynClaw" 按钮，点击后 setHasCompletedOnboarding(true)

动画：
- 步骤切换：AnimatePresence + motion.div（x: 20 → 0, opacity: 0 → 1）
- 所有动画受 animationsEnabled 控制
- 进度圆点：当前 active 高亮accent色，其余为 text-ter

样式：使用 globals.css CSS 变量（--accent-gradient, --bg-container, --text 等）
组件导出：export function OnboardingView(props: { onComplete: () => void })
</action>
```

---

## 03 - App.tsx 引导集成

**Objective:** 在 App.tsx 中集成引导界面，首次启动时显示引导，完成后切换到主界面。

**Requirements addressed:** ONBD-03

**Wave:** 1

**Files modified:**
- `client/src/renderer/App.tsx`

---

```yaml
---
objective: App.tsx 中集成引导界面，首次启动时显示引导层
depends_on: ["02"]
autonomous: false
---

<read_first>
client/src/renderer/App.tsx
client/src/renderer/stores/settingsStore.ts
</read_first>

<acceptance_criteria>
- grep "OnboardingView" client/src/renderer/App.tsx | grep -q "OnboardingView"
- grep "hasCompletedOnboarding" client/src/renderer/App.tsx | grep -q "hasCompletedOnboarding"
- cd client && pnpm exec tsc --noEmit 2>&1 | grep -v "^$" | tail -3
</acceptance_criteria>

<action>
修改 client/src/renderer/App.tsx：

1. 导入：
   import { OnboardingView } from './components/OnboardingView'

2. 解构 hasCompletedOnboarding：
   const { hasCompletedOnboarding, loadSettings } = useSettingsStore()

3. 在 loadSettings() 执行后检查引导状态：
   useEffect(() => {
     loadSettings()
   }, [loadSettings])

   // 如果尚未完成引导，不渲染主界面内容
   if (!hasCompletedOnboarding) {
     return <OnboardingView onComplete={() => {/* 触发重新渲染 */} />
   }

4. OnboardingView 的 onComplete 回调：
   const handleOnboardingComplete = useCallback(() => {
     // 设置已由 OnboardingView 内部通过 store 持久化
     // 此处只需触发重新渲染以显示主界面
     window.location.reload() // 最简单的方案，强制刷新以重新加载状态
   }, [])

5. 渲染逻辑调整为：
   {!hasCompletedOnboarding ? (
     <OnboardingView onComplete={handleOnboardingComplete} />
   ) : (
     // 现有主界面内容
   )}
</action>
```

---

## Verification

完成所有修改后，验证：

1. `cd client && pnpm exec tsc --noEmit` — TypeScript 零错误
2. `cd client && pnpm run build:renderer` — Vite 构建成功
3. 首次启动应显示引导界面（`hasCompletedOnboarding=false`）
4. 完成引导后重启应跳过引导（`hasCompletedOnboarding=true`）

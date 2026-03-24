# SynClaw 开发准则

> SynClaw 是 **OpenClaw 的 Electron 桌面壳**，而非独立的 AI 客户端。所有 AI 能力（Agent 运行、记忆、技能、工具）均来自 OpenClaw Gateway。SynClaw 负责：窗口管理、UI 渲染、IPC 桥接。

---

## 1. 核心架构原则

### 1.1 唯一真相来源：OpenClaw Gateway

```
┌──────────────────────────────────────────────────────────────┐
│                    SynClaw Electron (壳)                     │
│  ┌────────────────┐    ┌──────────────────────────────────┐ │
│  │  React UI      │◄──►│  IPC Bridge  (gateway-bridge.ts) │ │
│  │  (Zustand)     │    │  - OpenClaw GatewayClient         │ │
│  └────────────────┘    │  - IPC 透传                       │ │
│                        └──────────────┬───────────────────┘ │
└────────────────────────────────────────┼────────────────────┘
                                         │ WebSocket
                                         ▼
┌──────────────────────────────────────────────────────────────┐
│              OpenClaw Gateway (端口 18789)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Agent   │  │  Skills  │  │  Memory  │  │   Channels   │ │
│  │  Runtime │  │  System  │  │ (LanceDB)│  │  (30+ 渠道)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Tools   │  │   Cron   │  │   TTS    │  │    MCP       │ │
│  │  (MCP)  │  │ Scheduler│  │ / Talk   │  │   Protocol   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**SynClaw 的职责边界**：
- ✅ 窗口管理、系统托盘、快捷键
- ✅ UI 组件渲染、动画、主题
- ✅ Zustand 状态管理（仅限 UI 状态）
- ✅ OpenClaw Gateway WebSocket 桥接
- ✅ Electron IPC 事件分发到渲染进程
- ❌ **不实现** AI 推理（委托 OpenClaw）
- ❌ **不实现** 文件操作沙箱（委托 OpenClaw Tools）
- ❌ **不实现** 记忆存储（委托 OpenClaw Memory）
- ❌ **不实现** 技能执行（委托 OpenClaw Skills）
- ❌ **不实现** 消息渠道（委托 OpenClaw Channels）

### 1.2 集成模式：GatewayClient + IPC 桥接

SynClaw 直接 import `openclaw-source/src/gateway/client.ts`，通过其 `GatewayClient` 与 OpenClaw Gateway 通信。**不重新发明协议**。

```
渲染进程 (React)          主进程 (Electron)           OpenClaw
     │                           │                        │
     │  ipcRenderer.invoke       │                        │
     │ ──────────────────────►    │  client.request()       │
     │                           │ ──────────────────────►│
     │                           │ ◄──────────────────────│
     │ ◄──────────────────────   │  { id, ok, result }    │
     │  Promise<T>              │                        │
```

---

## 2. 技术选型

### 2.1 核心技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **桌面框架** | Electron | ^28.0.0 | 跨平台桌面应用 |
| **AI 后端** | OpenClaw Gateway | — | 所有 AI 能力来源，`openclaw-source/` |
| **UI 框架** | React | ^18.2.0 | 组件化 UI |
| **语言** | TypeScript | ^5.3.0 | 严格模式，无 `any` |
| **样式** | Tailwind CSS | ^3.3.0 | 原子化 CSS |
| **动画** | Framer Motion | ^10.16.0 | 流畅动画 |
| **状态管理** | Zustand | ^4.4.0 | UI 状态（OpenClaw 状态不上来） |
| **打包** | electron-builder | ^24.9.0 | 打包分发 |

### 2.2 OpenClaw 路径约定

| 环境 | OpenClaw 路径 |
|------|--------------|
| 开发 | `client/resources/openclaw-source/` |
| 生产 | `process.resourcesPath/openclaw-source`（extraResources） |

### 2.3 运行环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | **≥ 22.12.0** | OpenClaw Gateway 需要 |
| npm/pnpm | 最新版 | 安装依赖 |
| macOS | 最新版 | 构建和运行 |

> ⚠️ 注意：OpenClaw 要求 Node.js ≥ 22.12.0。构建脚本会检查版本。

---

## 3. 项目结构

### 3.1 目录规范

```
synclaw/
├── client/                      # Electron 桌面应用
│   ├── src/
│   │   ├── main/               # Electron 主进程
│   │   │   ├── index.ts        # 入口：创建窗口、启动 OpenClaw
│   │   │   ├── openclaw.ts     # OpenClaw 子进程管理（tsx 启动 TS 源码）
│   │   │   ├── gateway-bridge.ts  # ⭐ OpenClaw GatewayClient 桥接
│   │   │   ├── ipc-handlers.ts # IPC handlers：透传到 gateway-bridge
│   │   │   ├── tray.ts         # 系统托盘
│   │   │   ├── notifications.ts # Electron 通知
│   │   │   └── updater.ts      # 自动更新
│   │   ├── preload/            # 预加载脚本（contextBridge）
│   │   │   └── index.ts        # 暴露 window.openclaw / window.electronAPI
│   │   └── renderer/           # React 渲染进程
│   │       ├── App.tsx         # 根组件
│   │       ├── main.tsx        # 入口
│   │       ├── components/      # UI 组件
│   │       ├── stores/         # Zustand（仅 UI 状态）
│   │       ├── hooks/          # 自定义 Hooks
│   │       ├── styles/         # 全局样式、主题变量
│   │       └── types/          # 类型声明
│   ├── resources/
│   │   └── openclaw-source/   # OpenClaw 源码（含 node_modules/tsx）
│   ├── scripts/
│   │   ├── build-main.mjs     # 主进程构建脚本
│   │   └── download-openclaw.mjs # 下载 OpenClaw 源码
│   ├── package.json
│   └── electron-builder.yml
│
├── web/                      # Next.js 落地页 + 客户 Portal + 后端 API
│   ├── src/app/             # Next.js App Router（落地页 + API）
│   ├── prisma/schema.prisma # 数据库 Schema（PostgreSQL）
│   └── package.json
├── docs/
└── *.md
```

---

## 4. OpenClaw Gateway 集成规范

### 4.1 gateway-bridge.ts（必须实现）

这是 SynClaw 的**核心集成文件**，位于 `client/src/main/gateway-bridge.ts`。

**职责**：
1. 启动 OpenClaw 子进程（通过 `openclaw.ts`）
2. 等待 Gateway 就绪（轮询 `http://127.0.0.1:18789/ready`）
3. 实例化 `GatewayClient` 并连接
4. 将 Gateway RPC 方法透传给 IPC
5. 将 Gateway 事件（`EventFrame`）分发给渲染进程

**GatewayClient 核心方法**（按用途分组）：

```typescript
// 连接 & 生命周期
client.start()                    // 连接 ws://127.0.0.1:18789
client.stop()                     // 断开连接
await client.request('health')   // 健康检查

// Agent 对话（最常用）
await client.request('agent', { message, agentId?, sessionKey?, model?, thinking? })
await client.request('chat.send', { message, agentId?, sessionKey? })
await client.request('chat.history', { sessionKey?, limit? })
await client.request('chat.abort', { sessionKey? })

// 多 Agent / 分身
await client.request('agents.list')
await client.request('agents.create', { name, model?, systemPrompt? })
await client.request('agents.update', { id, ... })
await client.request('agents.delete', { id })

// 会话管理
await client.request('sessions.list', { limit?, agentId? })
await client.request('sessions.patch', { key, tags?, pinned?, model? })
await client.request('sessions.reset', { key, reason: 'new' | 'reset' })
await client.request('sessions.delete', { key })
await client.request('sessions.compact', { key })

// 技能系统
await client.request('skills.status', { agentId? })
await client.request('skills.install', { name, installId?, timeoutMs? })
await client.request('skills.update', { skillKey, enabled?, apiKey?, env? })

// 工具目录
await client.request('tools.catalog', { agentId?, includePlugins? })

// 记忆系统
await client.request('memory.search', { query, limit? })
await client.request('memory.save', { key, value, tags? })

// 配置
await client.request('config.get')
await client.request('config.patch', { raw, baseHash })
await client.request('config.apply')

// Cron 调度
await client.request('cron.list')
await client.request('cron.add', { id, agentId?, schedule, message? })
await client.request('cron.update', { id, ... })
await client.request('cron.remove', { id })
await client.request('cron.run', { id })

// 节点 & 配对
await client.request('node.pair', { name? })
await client.request('node.invoke', { key, method, params? })
```

**Gateway 事件**（通过 `client.onEvent()` 监听并 IPC 转发）：

| 事件 | 含义 | UI 响应 |
|------|------|---------|
| `agent` | Agent 运行事件 | 追加到 ChatView 消息流 |
| `chat` | 聊天消息 | 更新 ChatView |
| `presence` | 在线状态变化 | 更新 Header 连接状态 |
| `heartbeat` | 心跳 | 更新连接状态指示器 |
| `health` | 健康状态变化 | 更新系统状态 |
| `cron` | 定时任务事件 | 更新 TaskBoard |
| `update.available` | OpenClaw 更新可用 | 提示用户更新 |

### 4.2 IPC handlers 透传模式

所有 IPC handler 只做两件事：**接收渲染进程请求 → 调用 `gatewayBridge`**。不写任何业务逻辑。

```typescript
// ✅ 正确模式：透传
ipcMain.handle('openclaw:agent', async (_event, params) => {
  return await gatewayBridge.request('agent', params)
})

// ❌ 错误模式：在 IPC 中写业务逻辑
ipcMain.handle('openclaw:agent', async (_event, params) => {
  // 不要在这里做 OpenClaw 的事情
  const result = await someLocalLogic()
  return result
})
```

### 4.3 preload API 设计

```typescript
// window.openclaw — 直接对应 OpenClaw Gateway 方法
window.openclaw = {
  // 连接
  connect(): Promise<void>
  disconnect(): void
  onStatusChange(cb: (status: GatewayStatus) => void): void

  // 对话
  agent(params: AgentParams): Promise<AgentResult>
  chat(params: ChatParams): Promise<ChatResult>
  abortChat(sessionKey: string): Promise<void>

  // 分身
  avatars: {
    list(): Promise<Avatar[]>
    create(params: CreateAvatarParams): Promise<Avatar>
    update(id: string, params: Partial<Avatar>): Promise<Avatar>
    delete(id: string): Promise<void>
  }

  // 会话
  sessions: {
    list(params?: ListSessionsParams): Promise<Session[]>
    patch(key: string, params: PatchSessionParams): Promise<Session>
    reset(key: string): Promise<void>
  }

  // 技能
  skills: {
    status(): Promise<SkillStatus>
    install(params: InstallSkillParams): Promise<void>
    update(params: UpdateSkillParams): Promise<void>
  }

  // 工具
  tools: {
    catalog(): Promise<ToolCatalog>
  }

  // 记忆
  memory: {
    search(query: string): Promise<MemoryResult>
    save(key: string, value: string): Promise<void>
  }

  // 配置
  config: {
    get(): Promise<Config>
    patch(params: PatchConfigParams): Promise<void>
    apply(): Promise<void>
  }

  // Cron
  cron: {
    list(): Promise<CronJob[]>
    add(params: AddCronParams): Promise<void>
    update(id: string, params: Partial<CronJob>): Promise<void>
    remove(id: string): Promise<void>
  }

  // 事件监听
  on(cb: (event: OpenClawEvent) => void): () => void
}
```

---

## 5. 渲染进程（React）规范

### 5.1 状态分层

| 数据来源 | 存放位置 | 说明 |
|---------|---------|------|
| OpenClaw 实时数据 | `window.openclaw` 调用 | 不缓存在 Zustand |
| OpenClaw 持久化数据 | OpenClaw 自身（会话、配置） | SynClaw 不复制 |
| UI 状态 | Zustand `appStore` | 展开/收起、选中项、模态框等 |
| 临时输入 | React `useState` | 输入框、搜索等 |

### 5.2 数据获取时机

```typescript
// ✅ 正确：在组件 mount 时获取 OpenClaw 数据
useEffect(() => {
  const load = async () => {
    const skills = await window.openclaw.skills.status()
    setSkills(skills)
  }
  load()
}, [])

// ❌ 错误：将 OpenClaw 数据预存到 Zustand（造成数据不一致）
const { skills } = useAppStore() // ❌ 不要这样做
```

### 5.3 事件驱动更新

UI 通过监听 OpenClaw 事件保持同步，而非主动轮询：

```typescript
useEffect(() => {
  const unsubscribe = window.openclaw.on((event) => {
    if (event.type === 'agent') {
      // 追加到消息列表
      appendMessage(event.payload)
    }
    if (event.type === 'presence') {
      // 更新连接状态
      setConnected(event.payload.connected)
    }
  })
  return unsubscribe
}, [])
```

---

## 6. 组件接入规范

### 6.1 ChatView

```typescript
// 发送消息
const sendMessage = async (content: string) => {
  const result = await window.openclaw.agent({
    message: content,
    sessionKey: currentSessionKey,  // 从 URL 或 store 获取
    thinking: true,                  // 思维链
  })
  // 事件驱动：result 通过 on('agent') 事件返回
}

// 事件监听（关键！）
useEffect(() => {
  return window.openclaw.on((event) => {
    if (event.type === 'agent') {
      appendMessage(event.payload) // 追加 AI 响应片段
    }
  })
}, [])
```

### 6.2 SkillsPanel

```typescript
const loadSkills = async () => {
  const status = await window.openclaw.skills.status()
  setSkills(status.skills)
}

// 安装技能
const install = async (name: string) => {
  await window.openclaw.skills.install({ name, installId: crypto.randomUUID() })
  await loadSkills() // 重新加载
}
```

### 6.3 TaskBoard（Cron）

```typescript
const loadTasks = async () => {
  const jobs = await window.openclaw.cron.list()
  setTasks(jobs)
}

const createTask = async (params) => {
  await window.openclaw.cron.add(params)
  await loadTasks()
}
```

### 6.4 SettingsView

```typescript
// 读取配置
const config = await window.openclaw.config.get()

// 修改配置（OpenClaw 需要 baseHash 做乐观锁）
await window.openclaw.config.patch({ raw: newConfig, baseHash: config.baseHash })
await window.openclaw.config.apply()
```

---

## 7. 文件命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 主进程模块 | kebab-case | `gateway-bridge.ts`, `openclaw.ts` |
| React 组件 | PascalCase | `ChatView.tsx`, `SkillsPanel.tsx` |
| Hooks | camelCase，以 `use` 开头 | `useOpenClaw.ts`, `useGatewayStatus.ts` |
| Zustand Store | camelCase | `appStore.ts`, `chatStore.ts` |
| 类型文件 | kebab-case | `openclaw-types.ts` |

---

## 8. Git 提交规范

```
<类型>(<范围>): <描述>

类型: feat | fix | docs | style | refactor | chore
```

**示例**：

```bash
git commit -m "feat(gateway): 连接 OpenClaw Gateway 并透传 agent RPC"
git commit -m "feat(chat): ChatView 接入 openclaw.agent 事件流"
git commit -m "fix(preload): 修复 openclaw.on 事件监听内存泄漏"
```

---

## 9. 禁止事项

1. **禁止**在 IPC handlers 中写任何 AI / 业务逻辑（全部委托 OpenClaw）
2. **禁止**将 OpenClaw 数据缓存到 Zustand（导致数据陈旧）
3. **禁止**在渲染进程直接 import OpenClaw 源码（必须通过 IPC）
4. **禁止**修改 `openclaw-source/` 目录（它是上游依赖）
5. **禁止**使用 `any` 类型（OpenClaw GatewayClient 有完整 TypeScript 类型）
6. **禁止**在 UI 层做轮询获取 OpenClaw 状态（用事件驱动）

---

## 10. 快速开发 checklist

新功能开发前确认：

- [ ] OpenClaw 是否已提供该能力？（查 `gateway/server-methods-list.ts`）
- [ ] 如果有：通过 `gatewayBridge.request()` 调用
- [ ] 如果没有：考虑是否应该在上游 OpenClaw 实现，而非 SynClaw
- [ ] UI 层：通过 `window.openclaw` + 事件监听与 OpenClaw 通信
- [ ] UI 状态用 Zustand，OpenClaw 状态不用 Zustand

---

*文档版本：v2.1（Electron + OpenClaw 集成版）*
*最后更新：2026-03-20*

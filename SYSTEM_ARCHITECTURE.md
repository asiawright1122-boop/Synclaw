# SynClaw 系统架构

> SynClaw 是 **OpenClaw 的 Electron 桌面壳**，所有 AI 能力均来自 OpenClaw Gateway。
> 详见 [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) 中的架构原则。

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SynClaw Electron (桌面壳)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Renderer Process (React)                     │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐   │    │
│  │  │  技能面板   │  │   AI 对话   │  │ 文件浏览器  │  │ 设置中心  │   │    │
│  │  │ (Skills)   │  │ (Chat UI)  │  │(FileExplorer)│ │(Settings)│   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────────┘   │    │
│  │                                                                  │    │
│  │  Zustand (仅 UI 状态) ── window.openclaw ── 事件监听            │    │
│  │  preload.ts: contextBridge.exposeInMainWorld('openclaw', {...}) │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │ IPC                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Main Process (Electron)                    │    │
│  │  gateway-bridge.ts ── import GatewayClient from openclaw-source │    │
│  │  ipc-handlers.ts ─── 透传到 gatewayBridge.request()             │    │
│  │  openclaw.ts ─────── 子进程 spawn('node', ['openclaw.mjs'])    │    │
│  │  窗口管理 / 系统托盘 / 全局快捷键 / 通知                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │ WebSocket (ws://127.0.0.1:18789)    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 OpenClaw Gateway (内置于 openclaw-source)                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐           │
│  │  Agent   │  │  Skills  │  │  Memory  │  │   Channels   │           │
│  │  Runtime │  │  System  │  │ (LanceDB)│  │  (30+ 渠道)  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐           │
│  │  Tools   │  │   Cron   │  │   TTS    │  │    MCP      │           │
│  │  (MCP)   │  │ Scheduler│  │ / Talk   │  │   Protocol   │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘           │
│                                                                          │
│  HTTP API: /v1/chat/completions (OpenAI 兼容) /health /hooks/*         │
└─────────────────────────────────────────────────────────────────────────┘
```

## SynClaw 职责边界

| 做 | 不做 |
|---|---|
| 窗口管理、系统托盘、快捷键 | ❌ AI 推理 |
| UI 渲染、动画、主题 | ❌ 文件操作沙箱 |
| Zustand（仅 UI 状态） | ❌ 记忆存储 |
| Gateway WebSocket 桥接 | ❌ 技能执行 |
| IPC 事件分发到渲染进程 | ❌ 消息渠道集成 |

## 核心文件

| 文件 | 职责 |
|------|------|
| `client/src/main/gateway-bridge.ts` | OpenClaw GatewayClient 桥接（核心集成文件） |
| `client/src/main/openclaw.ts` | 子进程 spawn/stop/restart |
| `client/src/main/ipc-handlers.ts` | IPC 透传到 gatewayBridge |
| `client/src/preload/index.ts` | 暴露 `window.openclaw` API |
| `client/src/renderer/components/*.tsx` | UI 组件，调用 `window.openclaw` |
| `openclaw-source/src/gateway/client.ts` | GatewayClient SDK（不修改） |

---

## 进程架构

### Electron 多进程模型

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Main Process                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  BrowserWindow x N                                             │    │
│  │  - 主窗口                                                       │    │
│  │  - 设置弹窗                                                     │    │
│  │  - 通知窗口                                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Tray (系统托盘)                                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  IPC Main Handler                                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Go Service (子进程)                                           │    │
│  │  - stdio 通信                                                  │    │
│  │  - 健康检查                                                     │    │
│  │  - 自动重启                                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                              IPC (ipcMain)
                                    │
┌────────────────────────────────────┼────────────────────────────────────┐
│                           Preload Script                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  contextBridge.exposeInMainWorld('electronAPI', {...})         │    │
│  │  - 文件操作 API                                                │    │
│  │  - 技能运行 API                                               │    │
│  │  - AI 对话 API                                                │    │
│  │  - 设置 API                                                   │    │
│  │  - 窗口 API                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────┬────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Renderer Process                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  React Application                                            │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  Components                                               │  │    │
│  │  │  - Layout (布局)                                         │  │    │
│  │  │  - SkillsPanel (技能面板)                                │  │    │
│  │  │  - ChatView (对话视图)                                   │  │    │
│  │  │  - FileExplorer (文件浏览器)                            │  │    │
│  │  │  - SettingsView (设置视图)                              │  │    │
│  │  │  - TitleBar (自定义标题栏)                               │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  Hooks                                                    │  │    │
│  │  │  - useFileOperations()                                   │  │    │
│  │  │  - useSkillRunner()                                      │  │    │
│  │  │  - useAIChat()                                           │  │    │
│  │  │  - useSettings()                                        │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  Store (Zustand)                                         │  │    │
│  │  │  - skillStore                                            │  │    │
│  │  │  - chatStore                                             │  │    │
│  │  │  - fileStore                                             │  │    │
│  │  │  - settingsStore                                         │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 模块设计

### 1. 文件引擎 (FileEngine)

**职责**: 安全地操作用户本地文件系统

```go
// Go 模块: agent/fileengine/engine.go
type Engine struct {
    allowedPaths []string  // 用户授权的目录
    logger      *log.Logger
}

func (e *Engine) Read(path string) ([]byte, error)
func (e *Engine) Write(path string, content []byte) (int, error)
func (e *Engine) List(dirPath string) ([]FileInfo, error)
func (e *Engine) Delete(path string) error
func (e *Engine) Rename(oldPath, newPath string) error
func (e *Engine) Copy(src, dst string) error
func (e *Engine) Stat(path string) (fs.FileInfo, error)
```

**安全机制**:
- 路径白名单：只允许操作用户授权的目录
- 路径穿越防护：`../../etc/passwd` 被阻止
- 敏感目录保护：禁止访问系统目录
- 操作审计：所有操作记录日志

### 2. 技能运行器 (SkillRunner)

**职责**: 加载和执行用户技能

```go
// Go 模块: agent/skill/runner.go
type Runner struct {
    engine      *Engine
    aiGateway   *AIGateway
    skillDir    string
}

type Skill struct {
    Name        string          `json:"name"`
    Version     string          `json:"version"`
    Description string          `json:"description"`
    Prompts     []Prompt       `json:"prompts"`
    Actions     []Action       `json:"actions"`
    Config      json.RawMessage `json:"config"`
}

func (r *Runner) LoadSkills() ([]*Skill, error)
func (r *Runner) RunSkill(name string, input string) (string, error)
func (r *Runner) ValidateSkill(skill *Skill) error
```

### 3. AI 网关 (AIGateway)

**职责**: 统一管理 AI API 调用

```go
// Go 模块: agent/ai/gateway.go
type Gateway struct {
    client      *anthropic.Client
    config      *AIConfig
    rateLimiter *RateLimiter
}

type AIConfig struct {
    APIKey      string
    Model       string  // claude-3-5-sonnet-20241022
    MaxTokens   int
    Temperature float64
}

func (g *Gateway) Chat(messages []Message) (string, error)
func (g *Gateway) ChatWithTools(messages []Message, tools []Tool) (string, error)
```

### 4. 本地存储 (LocalStore)

**职责**: 管理本地配置和缓存

```go
// Go 模块: agent/store/store.go
type Store struct {
    db *badger.DB
}

func (s *Store) GetUserSettings() (*UserSettings, error)
func (s *Store) SaveUserSettings(settings *UserSettings) error
func (s *Store) GetSkillConfig(skillName string) (json.RawMessage, error)
func (s *Store) SaveSkillConfig(skillName string, config json.RawMessage) error
func (s *Store) GetChatHistory() ([]ChatSession, error)
func (s *Store) SaveChatMessage(sessionID string, msg ChatMessage) error
```

---

## IPC 通信协议

### 请求格式

```typescript
// 渲染进程 → 主进程
interface IPCRequest {
  channel: string;        // 'file:read', 'skill:run', etc.
  id: string;           // 请求 ID，用于追踪
  payload: any;         // 请求数据
}

interface IPCResponse {
  id: string;           // 对应请求 ID
  success: boolean;
  data?: any;          // 成功时返回
  error?: string;       // 失败时错误信息
}
```

### 核心 API

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `file:read` | R → M | `{path: string}` | `{content: string}` |
| `file:write` | R → M | `{path: string, content: string}` | `{bytes: number}` |
| `file:list` | R → M | `{path: string}` | `{files: FileInfo[]}` |
| `file:delete` | R → M | `{path: string}` | `{success: boolean}` |
| `skill:list` | R → M | `{}` | `{skills: Skill[]}` |
| `skill:run` | R → M | `{name: string, input: string}` | `{output: string}` |
| `ai:chat` | R → M | `{messages: Message[]}` | `{content: string}` |
| `ai:chatWithTools` | R → M | `{messages: Message[], tools: Tool[]}` | `{content: string}` |
| `settings:get` | R → M | `{key: string}` | `{value: any}` |
| `settings:set` | R → M | `{key: string, value: any}` | `{success: boolean}` |
| `window:minimize` | R → M | `{}` | `{success: boolean}` |
| `window:maximize` | R → M | `{}` | `{success: boolean}` |
| `window:close` | R → M | `{}` | `{success: boolean}` |

---

## 数据流

### 用户对话流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  React   │────▶│  IPC    │────▶│   Go     │
│ Input    │     │  UI      │     │  Bridge  │     │ Service  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                             │
                            ┌────────────────────────────────┤
                            │                                │
                            ▼                                ▼
                    ┌──────────────┐              ┌──────────────┐
                    │  FileEngine  │              │  AIGateway   │
                    │ (文件操作)   │              │ (AI API)     │
                    └──────────────┘              └──────────────┘
                            │                                │
                            └────────────────────────────────┤
                                                             │
                            ┌────────────────────────────────┤
                            │                                │
                            ▼                                ▼
                    ┌──────────────┐              ┌──────────────┐
                    │ 本地文件系统  │              │ Claude API   │
                    │              │              │              │
                    └──────────────┘              └──────────────┘
```

### 技能执行流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Skill   │────▶│  AI      │────▶│  File    │
│ triggers │     │  Panel   │     │  Gateway  │     │  Engine  │
│ skill    │     │          │     │           │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                              │
                                              │ 调用 AI
                                              ▼
                                       ┌──────────────┐
                                       │ Claude API   │
                                       └──────────────┘
                                              │
                                              │ 返回结果
                                              ▼
                                       ┌──────────────┐
                                       │  UI 显示结果  │
                                       └──────────────┘
```

---

## 部署打包

### Electron 打包流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           构建流程                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. 前端构建                                                            │
│     ┌─────────────────────────────────────────────────────────────┐      │
│     │  npm run build                                              │      │
│     │  - TypeScript 编译                                          │      │
│     │  - React 构建                                               │      │
│     │  - Tailwind CSS 打包                                        │      │
│     │  - 资源压缩                                                  │      │
│     └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│                              ▼                                          │
│  2. Go 服务编译                                                          │
│     ┌─────────────────────────────────────────────────────────────┐      │
│     │  GOOS=darwin GOARCH=amd64 go build -o synclaw             │      │
│     │  - CGO 交叉编译                                             │      │
│     │  - 静态链接                                                 │      │
│     └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│                              ▼                                          │
│  3. Electron 打包                                                         │
│     ┌─────────────────────────────────────────────────────────────┐      │
│     │  electron-builder --mac                                      │      │
│     │  - 合并 Go 二进制                                           │      │
│     │  - 打包资源                                                 │      │
│     │  - 代码签名                                                 │      │
│     │  - DMG/EXE 输出                                             │      │
│     └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│                              ▼                                          │
│  4. 输出                                                                  │
│     ┌─────────────────────────────────────────────────────────────┐      │
│     │  SynClaw-1.0.0.dmg  (~80MB)                                │      │
│     │  SynClaw-1.0.0.exe  (~90MB)                                │      │
│     └─────────────────────────────────────────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 用户安装体验

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          用户视角                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. 下载安装包                                                           │
│     - 从官网/GitHub Releases 下载                                        │
│     - SynClaw-1.0.0.dmg (80MB)                                         │
│                                                                          │
│  2. 一键安装                                                             │
│     - macOS: 拖拽到 Applications                                        │
│     - Windows: 双击下一步                                                │
│     - 无需安装 Node.js / Python / Go                                    │
│                                                                          │
│  3. 首次启动                                                             │
│     - 自动创建本地配置目录                                                │
│     - 引导设置 AI API Key                                               │
│     - 选择本地文件授权目录                                                │
│                                                                          │
│  4. 正常使用                                                             │
│     - 托盘常驻                                                          │
│     - 快捷键唤醒                                                        │
│     - 无需联网也可使用离线技能                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 安全设计

### 1. 进程隔离

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         安全边界                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Renderer Process (受限)                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  - 无 Node.js 权限                                               │    │
│  │  - 无文件系统直接访问                                            │    │
│  │  - 仅通过 preload API 通信                                       │    │
│  │  - contextIsolation: true                                        │    │
│  │  - nodeIntegration: false                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                           仅允许的安全 API                                │
│                                    │                                     │
│  Main Process (特权)                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  - 完整系统权限                                                  │    │
│  │  - 文件系统操作                                                  │    │
│  │  - 子进程管理                                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  Go Service (用户权限)                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  - 以当前用户运行                                                │    │
│  │  - 仅访问授权目录                                                │    │
│  │  - 无法访问系统敏感目录                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. 数据安全

| 数据类型 | 存储方式 | 加密 |
|----------|----------|------|
| **用户配置** | 本地 SQLite | 可选加密 |
| **AI API Key** | 系统 Keychain | 系统级加密 |
| **聊天记录** | 本地加密存储 | AES-256 |
| **技能配置** | 本地 JSON | 无敏感信息 |

---

## 性能优化

### 1. 启动优化

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         启动流程                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  用户点击图标                                                            │
│       │                                                                │
│       ▼                                                                │
│  ┌─────────────────┐                                                   │
│  │  显示启动画面    │  ← 显示 logo/加载动画 (200ms)                    │
│  └────────┬────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │  加载主进程      │  ← 初始化窗口/托盘 (100ms)                      │
│  └────────┬────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │  启动 Go 服务   │  ← 健康检查/进程通信 (300ms)                     │
│  └────────┬────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │  加载渲染进程    │  ← React  hydrate (200ms)                      │
│  └────────┬────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │  显示主界面      │  ← 可交互 (< 1s 总计)                           │
│  └─────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. 内存优化

- **懒加载**: 技能列表、文件树按需加载
- **虚拟列表**: 大目录使用虚拟滚动
- **缓存**: AI 响应、文件列表本地缓存
- **进程复用**: Go 服务常驻，避免重复启动

---

## 目录结构

```
synclaw/
├── client/                      # Electron 客户端
│   ├── src/
│   │   ├── main/               # Electron 主进程
│   │   │   ├── index.ts        # 入口
│   │   │   ├── ipc.ts          # IPC 处理
│   │   │   ├── tray.ts         # 托盘
│   │   │   ├── menu.ts         # 菜单
│   │   │   └── updater.ts      # 自动更新
│   │   ├── preload/            # 预加载脚本
│   │   │   └── index.ts
│   │   ├── renderer/            # 渲染进程 (React)
│   │   │   ├── App.tsx
│   │   │   ├── components/     # UI 组件
│   │   │   ├── hooks/          # 自定义 Hooks
│   │   │   ├── stores/         # Zustand 状态
│   │   │   ├── pages/          # 页面
│   │   │   └── styles/         # 样式
│   │   └── shared/             # 共享类型
│   ├── package.json
│   ├── electron-builder.yml
│   └── vite.config.ts
│
├── agent/                       # Go 服务 (内置)
│   ├── cmd/
│   │   └── synclaw/
│   │       └── main.go
│   ├── internal/
│   │   ├── fileengine/         # 文件引擎
│   │   ├── skill/              # 技能运行器
│   │   ├── ai/                 # AI 网关
│   │   ├── store/              # 本地存储
│   │   └── config/             # 配置管理
│   ├── pkg/                    # 公共包
│   └── go.mod
│
├── docs/                        # 文档
│   ├── PRODUCT_PLAN.md
│   ├── SYSTEM_ARCHITECTURE.md
│   └── ...
│
└── README.md
```

---

## 下一步

1. **初始化 Electron 项目** - `npm create electron-vite`
2. **集成 Go 服务** - 嵌入 Go 二进制到 Electron
3. **实现核心 UI** - React 组件开发
4. **打包测试** - electron-builder 打包验证

---

*文档版本：v1.0*
*最后更新：2026-03-18*

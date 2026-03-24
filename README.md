# SynClaw

> SynClaw 是 **OpenClaw** 的 Electron 桌面壳，让用户拥有炫酷的本地 AI 助手，安全地操作用户本地文件系统。

[![CI](https://github.com/synclaw/synclaw/actions/workflows/ci.yml/badge.svg)](https://github.com/synclaw/synclaw/actions/workflows/ci.yml)

---

## 核心特性

- **AI 对话** — 集成 Claude API，支持对话操作本地文件
- **技能系统** — 安装和管理 AI 技能（通过 ClawHub）
- **本地文件操作** — 通过 OpenClaw Tools 安全操作用户文件系统
- **系统托盘** — 最小化到托盘，后台运行
- **全局快捷键** — 自定义快捷键唤醒
- **IM 频道集成** — 支持飞书、企业微信等渠道（通过 OpenClaw Channels）
- **MCP 协议** — 支持 MCP (Model Context Protocol) 工具
- **主题系统** — 暗色优先，多种主题支持

---

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│              SynClaw Electron (桌面壳)                │
├─────────────────────────────────────────────────────┤
│  Renderer: React 18 + TypeScript + Tailwind + Zustand
│  Main: Electron 28 + gateway-bridge.ts              │
│  Backend: OpenClaw Gateway (内置, 端口 18789)        │
└─────────────────────────────────────────────────────┘
```

详见 [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)。

---

## 快速开始

### 前置要求

- Node.js >= 20
- pnpm >= 8
- macOS / Windows / Linux

### 安装依赖

```bash
cd client
pnpm install
```

### 下载 OpenClaw

```bash
node scripts/download-openclaw.mjs
```

### 开发模式

```bash
pnpm run electron:dev
```

### 构建

```bash
pnpm run build
pnpm run electron:build        # 全平台
pnpm run electron:build:mac   # macOS
pnpm run electron:build:win   # Windows
```

---

## 项目结构

```
synclaw/
├── client/                      # Electron 客户端
│   ├── src/
│   │   ├── main/               # 主进程
│   │   │   ├── index.ts        # 入口：窗口、托盘、快捷键
│   │   │   ├── openclaw.ts     # OpenClaw 子进程管理
│   │   │   ├── gateway-bridge.ts # OpenClaw GatewayClient 桥接
│   │   │   ├── ipc-handlers.ts # IPC handlers 透传
│   │   │   ├── tray.ts         # 系统托盘
│   │   │   ├── menu.ts         # 应用菜单
│   │   │   └── updater.ts      # 自动更新
│   │   ├── preload/
│   │   │   └── index.ts        # 暴露 window.openclaw API
│   │   └── renderer/           # React 渲染进程
│   │       ├── App.tsx
│   │       ├── components/     # UI 组件
│   │       ├── stores/         # Zustand (仅 UI 状态)
│   │       └── hooks/          # 自定义 Hooks
│   ├── resources/
│   │   └── openclaw-source/    # OpenClaw 源码（自动下载）
│   ├── scripts/
│   │   ├── download-openclaw.mjs
│   │   └── build-main.mjs
│   └── e2e/                    # Playwright E2E 测试
│
├── docs/
│   ├── PRODUCT_PLAN.md         # 产品计划
│   ├── SYSTEM_ARCHITECTURE.md  # 系统架构
│   ├── DEVELOPMENT_GUIDELINES.md # 开发准则
│   └── planning/
│       └── progress.md         # 开发进度
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI 流水线
│       └── release.yml         # 发布流水线
│
└── *.md                        # 根目录文档
```

---

## 文档

| 文档 | 说明 |
|------|------|
| [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) | 开发准则、架构原则、集成规范 |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | 系统架构详解 |
| [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) | 产品计划、功能规划 |
| [docs/planning/progress.md](./docs/planning/progress.md) | 开发进度记录 |

---

## License

MIT

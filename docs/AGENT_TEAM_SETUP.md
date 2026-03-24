# SynClaw Agent 团队配置

> 多 Agent 并行开发配置与任务分配

---

## Agent 团队架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SynClaw Agent 团队                               │
│                                                                          │
│  ┌─────────────────────┐                                               │
│  │   协调者 (当前)      │ ← 你在这里                                     │
│  │   (Coordinator)     │                                                │
│  │   - 任务分配         │                                                │
│  │   - 进度跟踪         │                                                │
│  │   - 质量把控         │                                                │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│    ┌────────┼────────┐                                                  │
│    │        │        │                                                  │
│    ▼        ▼        ▼                                                  │
│  ┌────┐  ┌────┐  ┌────┐                                               │
│  │Agent│  │Agent│  │Agent│                                              │
│  │ 1   │  │ 2   │  │ 3   │                                              │
│  │桌面端│  │Web前端│  │后端  │                                              │
│  └────┘  └────┘  └────┘                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Agent 职责分配

### Agent 1: 桌面端开发

**职责:** Electron 客户端 + OpenClaw Gateway 集成

```
任务清单:
├── Phase 2A: OpenClaw Gateway 集成完善
│   ├── 订阅状态 API 集成
│   ├── BYOK 模式检测
│   └── 积分余额查询
│
├── Phase 2B: API Key 管理界面
│   ├── API Key 创建/删除
│   ├── 权限配置
│   └── 使用统计
│
└── 持续优化桌面端 UX/UI
```

**需要的设计文档:**
- `DEVELOPMENT_GUIDELINES.md`
- `SYSTEM_ARCHITECTURE.md`

**交付位置:** `client/` 目录

---

### Agent 2: Web 前端开发

**职责:** 落地页 + 客户 Portal + 平台管理后台

```
任务清单:
├── Phase 1A: Next.js 项目初始化
│   ├── 项目脚手架
│   ├── shadcn/ui 配置
│   └── Tailwind 配置
│
├── Phase 3A: 落地页开发
│   ├── 首页 Hero
│   ├── 功能介绍
│   ├── 定价页
│   └── 下载页
│
├── Phase 3B: 客户 Portal MVP
│   ├── 账户概览
│   ├── 订阅管理
│   ├── 积分充值
│   └── API Key 管理
│
└── Phase 4: 平台管理后台
    ├── 客户管理
    ├── 订单管理
    ├── 套餐/积分配置
    └── IM 渠道管理
```

**需要的设计文档:**
- `docs/LANDING_PAGE_DESIGN.md`
- `docs/CUSTOMER_PORTAL_DESIGN.md`
- `docs/PLATFORM_ADMIN_DESIGN.md`

**交付位置:** `web/` 目录（新项目）

---

### Agent 3: 后端开发

**职责:** API + 数据库 + 支付 + IM 渠道

```
任务清单:
├── Phase 1A: 数据库设计
│   ├── Prisma Schema
│   ├── 迁移脚本
│   └── 种子数据
│
├── Phase 1B: 认证系统
│   ├── NextAuth.js 配置
│   ├── 注册/登录 API
│   └── JWT Session
│
├── Phase 3C: Stripe 支付集成
│   ├── Checkout 集成
│   ├── Webhook 处理
│   ├── 订阅管理
│   └── 积分充值
│
└── Phase 5: IM 渠道集成
    ├── 飞书适配器
    └── 企业微信适配器
```

**需要的设计文档:**
- `docs/COMMERCIAL_DESIGN.md`
- `docs/IM_CHANNELS_DESIGN.md`
- `docs/DEVELOPMENT_ROADMAP.md`

**交付位置:** `web/app/api/` 目录

---

## Agent 任务提示词模板

### Agent 1: 桌面端

```
# SynClaw 桌面端开发任务

## 项目信息
- 项目路径: /Users/kaka/Desktop/synclaw
- 桌面端目录: client/
- 设计文档: DEVELOPMENT_GUIDELINES.md, SYSTEM_ARCHITECTURE.md

## 你的职责
开发 SynClaw 桌面端（Electron + React），与 OpenClaw Gateway 集成。

## 当前任务
[根据 Phase 2 任务分配]

## 技术栈
- Electron 28 + React 18 + TypeScript
- Vite 构建
- Tailwind CSS
- Framer Motion
- Zustand 状态管理

## OpenClaw Gateway 集成
- Gateway 运行在桌面端
- 通过 WebSocket 连接 ws://127.0.0.1:18789
- 使用 window.openclaw API 与 Gateway 通信

## 设计约束
- 不实现 AI 推理（委托 OpenClaw）
- 不实现文件操作沙箱（委托 OpenClaw Tools）
- UI 状态用 Zustand，OpenClaw 状态不用 Zustand

## 输出要求
1. 完成代码实现
2. 更新相关文档
3. 汇报完成情况
```

### Agent 2: Web 前端

```
# SynClaw Web 前端开发任务

## 项目信息
- 项目路径: /Users/kaka/Desktop/synclaw
- Web 目录: web/ (新项目)
- 设计文档:
  - docs/LANDING_PAGE_DESIGN.md
  - docs/CUSTOMER_PORTAL_DESIGN.md
  - docs/PLATFORM_ADMIN_DESIGN.md

## 你的职责
开发 SynClaw 落地页、客户 Portal 和平台管理后台。

## 当前任务
[根据 Phase 1-4 任务分配]

## 技术栈
- Next.js 15 (App Router)
- Tailwind CSS v4
- shadcn/ui + Radix
- Framer Motion
- React Query
- Zustand

## 设计系统
- 暗色主题优先
- 配色: 品牌紫 #7C3AED + 科技蓝 #3B82F6
- 字体: Inter + JetBrains Mono
- 图标: Lucide Icons

## 套餐体系
| 套餐 | 价格 | IM 渠道 |
|------|------|---------|
| BYOK | $0 | ❌（可后台开启） |
| Pro | $9 | ✅ 1个 |
| Ultra | $29 | ✅ 全部 |

## 输出要求
1. 完成代码实现
2. 确保响应式布局
3. 汇报完成情况
```

### Agent 3: 后端

```
# SynClaw 后端开发任务

## 项目信息
- 项目路径: /Users/kaka/Desktop/synclaw
- API 目录: web/app/api/
- 设计文档:
  - docs/COMMERCIAL_DESIGN.md
  - docs/IM_CHANNELS_DESIGN.md
  - docs/DEVELOPMENT_ROADMAP.md

## 你的职责
开发 SynClaw 后端 API、数据库和支付系统。

## 当前任务
[根据 Phase 1-5 任务分配]

## 技术栈
- Next.js API Routes
- Prisma ORM
- PostgreSQL (Supabase)
- Redis (Upstash)
- NextAuth.js
- Stripe SDK

## 数据库模型
- User: 用户信息
- Subscription: 订阅状态 (BYOK/PRO/ULTRA)
- Order: 订单记录
- ApiKey: API Key
- CreditTransaction: 积分流水
- ImChannel: IM 渠道配置

## Stripe 集成
- 订阅: Pro ($9), Ultra ($29)
- 积分充值: 按量计费
- Webhook: checkout.session.completed, invoice.paid 等

## IM 渠道
- 统一消息总线架构
- 适配器模式
- 先接飞书 + 企业微信

## 输出要求
1. 完成 API 实现
2. 编写数据库迁移
3. 配置 Webhook 处理
4. 汇报完成情况
```

---

## 并行开发策略

```
第 1 阶段 (并行):
├── Agent 1: Phase 2 (桌面端完善)
├── Agent 2: Phase 1A (Next.js 项目初始化)
└── Agent 3: Phase 1A (数据库设计) + Phase 1B (认证系统)

第 2 阶段 (并行):
├── Agent 1: 持续优化桌面端
├── Agent 2: Phase 3A (落地页)
└── Agent 3: Phase 3C (Stripe 支付)

第 3 阶段 (并行):
├── Agent 2: Phase 3B (客户 Portal)
└── Agent 3: Phase 4 (平台后台 API)

第 4 阶段 (串行/并行):
├── Agent 2: Phase 4 (平台管理后台 UI)
└── Agent 3: Phase 5 (IM 渠道)
```

---

## 质量把控

### 协调者检查清单

每个 Phase 完成后，协调者需要验证：

- [ ] 代码符合设计文档
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 错误
- [ ] 响应式布局正常
- [ ] API 端点可访问
- [ ] 数据库迁移成功
- [ ] 无安全问题
- [ ] 文档已更新

### 集成测试

各 Agent 完成模块后，需要进行集成测试：

```
桌面端 ←→ 后端 API
Web 前端 ←→ 后端 API
桌面端 ←→ OpenClaw Gateway
IM 渠道 ←→ OpenClaw Gateway
```

---

## 沟通机制

### 每日站会 (建议)

每个 Agent 汇报：
1. 昨天完成了什么
2. 今天计划做什么
3. 遇到什么阻碍

### 周报 (协调者)

汇总周报给团队：
```
## Week X (日期)

### 完成情况
- [Agent 1] ...
- [Agent 2] ...
- [Agent 3] ...

### 下周计划
- [Agent 1] ...
- [Agent 2] ...
- [Agent 3] ...

### 问题与风险
- ...
```

---

## 启动步骤

1. **确认开发环境**
   - [ ] 所有 Agent 可访问项目代码
   - [ ] 数据库访问权限
   - [ ] Stripe 测试环境

2. **分配任务**
   - [ ] Agent 1: Phase 2 任务
   - [ ] Agent 2: Phase 1A 任务
   - [ ] Agent 3: Phase 1A + 1B 任务

3. **启动开发**
   - [ ] 启动 Agent 1 (桌面端)
   - [ ] 启动 Agent 2 (Web 前端)
   - [ ] 启动 Agent 3 (后端)

4. **监控进度**
   - [ ] 每日检查进度
   - [ ] 解决阻塞问题
   - [ ] 调整任务分配

---

*文档版本：v1.0*
*最后更新：2026-03-20*

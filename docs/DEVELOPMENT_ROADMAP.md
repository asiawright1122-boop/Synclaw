# SynClaw 开发路线图

> 分阶段开发计划，按功能模块优先级排序

---

## 产品确认

### 套餐体系

| 套餐 | 价格 | 月度积分 | IM 渠道 | BYOK |
|------|------|---------|---------|------|
| **BYOK** | $0 | ❌ 无 | ❌（可后台开启） | ✅ 自带 API Key |
| **Pro** | $9 | 1000积分 | ✅ 1个 | ✅ |
| **Ultra** | $29 | 5000积分 | ✅ 全部 | ✅ |

**关键规则：**
- IM 渠道绑定订阅，可在管理后台调整
- 免费用户积分可在管理后台配置
- 先接海外支付（Stripe），后期国内（微信/支付宝）
- 桌面端为核心，Portal 为管理后台

---

## 开发阶段总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SynClaw 开发路线图                                │
│                                                                          │
│  Phase 1 ─────────────────────────────────────────────────────────────  │
│  基础设施                                                               │
│  ├── A. 项目初始化 (Next.js + 数据库 + CI/CD)                          │
│  └── B. 认证系统 (用户注册/登录/邮箱验证)                               │
│                                                                          │
│  Phase 2 ─────────────────────────────────────────────────────────────  │
│  桌面端完善                                                             │
│  ├── A. OpenClaw Gateway 集成完善                                        │
│  ├── B. 订阅状态同步 (桌面端读取订阅状态)                               │
│  └── C. API Key 管理界面                                                │
│                                                                          │
│  Phase 3 ─────────────────────────────────────────────────────────────  │
│  落地页 + 客户 Portal MVP                                               │
│  ├── A. 落地页开发                                                     │
│  ├── B. 客户 Portal 基础 (订阅/积分/API Key)                            │
│  └── C. Stripe 支付集成                                                 │
│                                                                          │
│  Phase 4 ─────────────────────────────────────────────────────────────  │
│  平台管理后台 MVP                                                        │
│  ├── A. 客户管理                                                       │
│  ├── B. 订单管理                                                       │
│  ├── C. 套餐/积分配置                                                  │
│  └── D. IM 渠道管理                                                     │
│                                                                          │
│  Phase 5 ─────────────────────────────────────────────────────────────  │
│  IM 渠道 (飞书/企微)                                                    │
│  ├── A. 飞书 Bot 集成                                                  │
│  └── B. 企业微信集成                                                    │
│                                                                          │
│  Phase 6 ─────────────────────────────────────────────────────────────  │
│  高级功能                                                               │
│  ├── A. 国内支付 (微信/支付宝)                                          │
│  ├── B. 工单系统                                                       │
│  └── C. 技能市场                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 基础设施

### Phase 1A: 项目初始化

**目标**: 搭建完整的开发基础设施

**交付物:**
- [ ] Next.js 15 项目初始化
- [ ] PostgreSQL 数据库设计与迁移
- [ ] Redis 缓存配置
- [ ] CI/CD 流水线配置
- [ ] 环境变量配置
- [ ] 基础组件库 (shadcn/ui) 初始化

**技术栈:**
```
Frontend: Next.js 15 + Tailwind CSS + shadcn/ui + Framer Motion
Backend: Next.js API Routes + Prisma ORM
Database: PostgreSQL (Supabase)
Cache: Redis (Upstash)
CI/CD: GitHub Actions
Deploy: Vercel (Web) + 自行部署 (Gateway)
```

**验收标准:**
- `npm run dev` 可正常启动
- 数据库迁移成功
- CI/CD 流水线运行正常

---

### Phase 1B: 认证系统

**目标**: 用户注册/登录/邮箱验证

**交付物:**
- [ ] 用户注册 (邮箱 + 密码)
- [ ] 用户登录 (邮箱 + 密码)
- [ ] 邮箱验证
- [ ] 密码重置
- [ ] JWT Session 管理
- [ ] NextAuth.js 配置

**数据库模型:**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  passwordHash  String
  name          String?
  avatar        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  subscription  Subscription?
  apiKeys       ApiKey[]
  credits       CreditTransaction[]
  imChannels    ImChannel[]
}

model Subscription {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  plan           Plan     @default(BYOK)
  stripeCustomerId String?
  stripeSubscriptionId String?
  status         SubscriptionStatus @default(ACTIVE)
  currentPeriodEnd DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

enum Plan {
  BYOK
  PRO
  ULTRA
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
}
```

**验收标准:**
- 新用户可注册并收到验证邮件
- 已验证用户可登录
- 未验证用户无法使用服务

**依赖:** Phase 1A

---

## Phase 2: 桌面端完善

### Phase 2A: OpenClaw Gateway 集成完善

**目标**: 确保桌面端与云端订阅状态同步

**交付物:**
- [ ] Gateway 订阅状态 API
- [ ] 桌面端订阅状态读取
- [ ] BYOK 模式检测
- [ ] 积分余额查询
- [ ] API Key 验证

**API 设计:**
```typescript
// GET /api/user/subscription
// 返回用户当前订阅状态

// GET /api/user/credits
// 返回用户积分余额

// POST /api/gateway/verify-key
// 验证 API Key 是否有效
```

**验收标准:**
- 桌面端可根据订阅状态启用/禁用功能
- BYOK 用户不消耗平台积分

**依赖:** Phase 1B

---

### Phase 2B: API Key 管理界面

**目标**: 桌面端内置 API Key 管理

**交付物:**
- [ ] API Key 列表页
- [ ] 创建 API Key
- [ ] 删除 API Key
- [ ] API Key 权限配置
- [ ] 使用量统计

**数据库模型:**
```prisma
model ApiKey {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  name         String
  keyHash      String   @unique
  permissions  Json     // { readHistory, sendMessage, manageSkills, ... }
  lastUsedAt   DateTime?
  expiresAt    DateTime?
  createdAt    DateTime @default(now())
}

model ApiKeyUsage {
  id        String   @id @default(cuid())
  apiKeyId  String
  endpoint  String
  credits   Int      @default(0)
  createdAt DateTime @default(now())
}
```

**验收标准:**
- 用户可创建多个 API Key
- 可设置不同权限
- 可查看使用统计

**依赖:** Phase 1B

---

## Phase 3: 落地页 + 客户 Portal MVP

### Phase 3A: 落地页开发

**目标**: 品牌官网 + 下载入口

**交付物:**
- [ ] 首页 (Hero + 功能 + 定价 + CTA)
- [ ] 下载页 (macOS/Windows/Linux)
- [ ] 定价页 (详细套餐对比)
- [ ] 文档页 (快速开始)
- [ ] SEO 优化

**页面结构:**
```
/                    首页
/download            下载
/pricing            定价
/docs                文档入口
/docs/getting-started 快速开始
```

**验收标准:**
- Lighthouse Score > 90
- 所有链接可访问
- 响应式布局正常

**依赖:** Phase 1A

---

### Phase 3B: 客户 Portal MVP

**目标**: 用户自管理后台基础功能

**交付物:**
- [ ] 账户概览 (订阅状态 + 积分余额)
- [ ] 个人信息管理
- [ ] 订阅管理 (升级/降级/取消)
- [ ] 积分充值
- [ ] API Key 管理
- [ ] IM 渠道配置入口

**页面结构:**
```
/account                    概览
/account/profile            个人信息
/account/subscription       订阅管理
/account/credits            积分管理
/account/api-keys           API Key
/account/channels           IM 渠道
/account/security           安全设置
```

**验收标准:**
- 用户可查看订阅状态
- 用户可充值积分
- 用户可管理 API Key

**依赖:** Phase 1B + Phase 2B

---

### Phase 3C: Stripe 支付集成

**目标**: 海外支付接入

**交付物:**
- [ ] Stripe Checkout 集成
- [ ] 订阅创建/更新/取消
- [ ] Webhook 处理
- [ ] 积分充值
- [ ] 退款处理

**Webhook 事件:**
```typescript
// 需要处理的 Stripe 事件
- checkout.session.completed  // 订阅创建
- invoice.paid               // 续费成功
- invoice.payment_failed      // 续费失败
- customer.subscription.deleted  // 订阅取消
- charge.refunded            // 退款
```

**数据库模型:**
```prisma
model Order {
  id              String      @id @default(cuid())
  userId          String
  user            User       @relation(fields: [userId], references: [id])
  type            OrderType
  amount          Int         // 金额（分）
  currency        String      @default("usd")
  status          OrderStatus @default(PENDING)
  stripePaymentId String?
  credits         Int?        // 积分充值时
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum OrderType {
  SUBSCRIPTION
  UPGRADE
  CREDIT_PURCHASE
  REFUND
}

enum OrderStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}
```

**验收标准:**
- 用户可订阅 Pro/Ultra
- 用户可充值积分
- 续费/退款正常处理

**依赖:** Phase 3B

---

## Phase 4: 平台管理后台 MVP

### Phase 4A: 客户管理

**目标**: 运营方管理所有客户

**交付物:**
- [ ] 客户列表 (分页/筛选/搜索)
- [ ] 客户详情
- [ ] 编辑客户 (修改订阅/积分)
- [ ] 封禁/解封客户

**功能:**
```
客户列表:
├── 筛选: 套餐 / 状态 / 注册时间
├── 搜索: 邮箱 / 姓名
├── 批量操作: 发送邮件 / 导出
└── 点击行 → 客户详情

客户详情:
├── 基本信息
├── 订阅信息
├── 积分余额
├── 订单记录
├── API Key
├── IM 渠道
└── 操作: 修改订阅 / 增加积分 / 封禁
```

**验收标准:**
- 可查看所有客户
- 可修改订阅状态
- 可调整积分余额

---

### Phase 4B: 订单管理

**目标**: 所有订单查看与处理

**交付物:**
- [ ] 订单列表
- [ ] 订单详情
- [ ] 退款处理
- [ ] 对账统计

**功能:**
```
订单列表:
├── 筛选: 类型 / 状态 / 时间
├── 搜索: 订单号 / 用户
├── 统计: 今日收入 / 成功率
└── 导出 CSV

退款处理:
├── 发起退款
├── 退款状态跟踪
└── 退款统计
```

**验收标准:**
- 可查看所有订单
- 可执行退款
- 统计数据准确

---

### Phase 4C: 套餐与积分配置

**目标**: 运营方可调整套餐和积分规则

**交付物:**
- [ ] 套餐配置页面
- [ ] 积分定价配置
- [ ] 免费用户积分配置
- [ ] IM 渠道订阅绑定配置

**配置项:**
```
套餐配置:
├── BYOK: $0, 功能列表
├── Pro: $9, 1000积分, 1个IM
└── Ultra: $29, 5000积分, 全部IM

积分配置:
├── 1000积分 = $1
├── AI 对话费率 (per 1K tokens)
├── 免费用户积分: [开启/关闭] [默认额度]
└── 余额预警阈值

IM 渠道配置:
├── IM 与订阅绑定: [可配置]
│   ├── BYOK: 可用 IM 数量 = 0 (可调)
│   ├── Pro: 可用 IM 数量 = 1 (可调)
│   └── Ultra: 可用 IM 数量 = 全部 (可调)
└── 新 IM 渠道上线后默认绑定套餐
```

**验收标准:**
- 修改套餐价格即时生效
- 修改积分规则即时生效
- IM 绑定配置即时生效

---

### Phase 4D: IM 渠道管理

**目标**: 监控所有 IM 渠道状态

**交付物:**
- [ ] IM 渠道概览
- [ ] 各渠道配置
- [ ] 消息统计
- [ ] 错误告警

**功能:**
```
渠道概览:
├── 各渠道连接数
├── 消息量统计
├── 错误率
└── 限流触发

渠道配置:
├── 飞书: App ID / Secret / Webhook
├── 企业微信: Agent ID / Secret
├── 钉钉: App Key / Secret
└── ...
```

**验收标准:**
- 可查看各渠道状态
- 可配置渠道参数
- 可监控错误

---

## Phase 5: IM 渠道集成

### Phase 5A: 飞书 Bot 集成

**目标**: 用户可在飞书与 SynClaw 对话

**交付物:**
- [ ] 飞书适配器开发
- [ ] Webhook 接收
- [ ] 消息发送
- [ ] 用户绑定流程

**功能:**
```
用户首次使用:
1. 在 Portal 点击"连接飞书"
2. 复制 Webhook URL 到飞书应用配置
3. 验证连接成功
4. 在飞书 @SynClaw 开始对话

对话流程:
1. 飞书消息 → Webhook → 服务器
2. 服务器 → OpenClaw Gateway
3. Gateway → AI 处理
4. AI 回复 → 飞书消息
```

**验收标准:**
- 用户可在飞书与 AI 对话
- 回复延迟 < 10s
- IM 渠道受订阅限制

---

### Phase 5B: 企业微信集成

**目标**: 用户可在企业微信与 SynClaw 对话

**交付物:**
- [ ] 企业微信适配器开发
- [ ] 消息接收与发送
- [ ] 用户绑定

**验收标准:**
- 用户可在企业微信与 AI 对话
- IM 渠道受订阅限制

---

## Phase 6: 高级功能

### Phase 6A: 国内支付 (微信/支付宝)

**目标**: 支持国内用户支付

**交付物:**
- [ ] 微信支付集成
- [ ] 支付宝集成
- [ ] 汇率转换
- [ ] 国内定价 (¥63/¥189)

**定价:**
| 套餐 | 海外 | 国内 |
|------|------|------|
| BYOK | $0 | ¥0 |
| Pro | $9 | ¥63 |
| Ultra | $29 | ¥189 |

**验收标准:**
- 国内用户可正常支付
- 汇率转换正确

---

### Phase 6B: 工单系统

**目标**: 客户支持工单处理

**交付物:**
- [ ] 客户提交工单
- [ ] 客服分配工单
- [ ] 工单处理
- [ ] 工单统计

**验收标准:**
- 客户可提交工单
- 客服可处理工单
- 工单统计准确

---

### Phase 6C: 技能市场 (后期)

**目标**: 付费技能生态

**交付物:**
- [ ] 技能发布
- [ ] 技能商店
- [ ] 付费技能
- [ ] 创作者分成

**验收标准:**
- 创作者可发布技能
- 用户可购买技能
- 分成结算正确

---

## 开发优先级与人力配置

### 推荐开发顺序

```
第 1-2 周: Phase 1 (基础设施)
第 3-4 周: Phase 2 (桌面端完善)
第 5-8 周: Phase 3 (落地页 + Portal MVP)
第 9-12 周: Phase 4 (平台后台 MVP)
第 13-16 周: Phase 5 (IM 渠道)
第 17+ 周: Phase 6 (高级功能)
```

### Agent 团队配置建议

| 模块 | Agent 数量 | 说明 |
|------|-----------|------|
| 桌面端 | 1 | 专注 Electron + Gateway |
| Web 前端 | 1 | 落地页 + Portal + 后台 |
| 后端 | 1 | API + 支付 + IM |
| DevOps | 0.5 | CI/CD + 部署 |

**并行开发策略:**
```
Agent 1 (桌面端): Phase 2 (依赖 Phase 1B)
Agent 2 (Web 前端): Phase 3A (依赖 Phase 1A)
Agent 3 (后端): Phase 1 + Phase 3C (Stripe)
                          ↓
              Phase 4 (平台后台)
                          ↓
              Phase 5 (IM 渠道)
```

---

## 文档索引

| 阶段 | 详细设计文档 |
|------|-------------|
| Phase 1 | - |
| Phase 2 | `DEVELOPMENT_GUIDELINES.md` |
| Phase 3 | `docs/LANDING_PAGE_DESIGN.md` + `docs/CUSTOMER_PORTAL_DESIGN.md` |
| Phase 4 | `docs/PLATFORM_ADMIN_DESIGN.md` |
| Phase 5 | `docs/IM_CHANNELS_DESIGN.md` |
| Phase 6 | `docs/COMMERCIAL_DESIGN.md` |

---

## 下一步

1. **确认开发顺序** — 是否按上述顺序开发？
2. **配置 Agent 团队** — 确定每个 Agent 的职责
3. **启动开发** — 从 Phase 1 开始

---

*文档版本：v1.0*
*最后更新：2026-03-20*

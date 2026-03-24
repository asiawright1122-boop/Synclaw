# SynClaw IM 渠道架构设计文档

> 统一消息总线 · 各渠道适配器 · 后期接入策略

---

## 1. 架构概述

### 1.1 设计目标

```
┌─────────────────────────────────────────────────────────────┐
│                    SynClaw IM 渠道系统                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  用户在 IM 中 @SynClaw  →  消息路由到 OpenClaw Gateway      │
│                          →  AI 处理                         │
│                          →  回复到 IM                        │
│                                                              │
│  支持渠道: 飞书 · 企业微信 · 钉钉 · Slack · Discord · Teams · Telegram · WhatsApp │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心原则

1. **统一消息总线** — 所有 IM 渠道通过同一套消息总线接入
2. **适配器模式** — 每个渠道独立适配，互不影响
3. **OpenClaw Gateway** — 消息处理统一在 Gateway 层
4. **可插拔** — 渠道可随时接入/移除
5. **后期接入** — 核心功能打磨后再接入 IM

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              用户层                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  飞书   │  │ 企业微信 │  │  钉钉   │  │  Slack  │  │ Discord │    │
│  │  用户   │  │  用户   │  │  用户   │  │  用户   │  │  用户   │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
└───────┼───────────┼───────────┼───────────┼───────────┼──────────────┘
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          IM 渠道适配器层                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  飞书   │  │ 企业微信 │  │  钉钉   │  │  Slack  │  │ Discord │    │
│  │ Adapter │  │ Adapter │  │ Adapter │  │ Adapter │  │ Adapter │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
└───────┼───────────┼───────────┼───────────┼───────────┼──────────────┘
        │           │           │           │           │
        └───────────┴─────┬─────┴───────────┴───────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          统一消息总线 (Message Bus)                       │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Message Router                                 │   │
│  │  • 消息格式标准化                                                │   │
│  │  • 用户身份映射                                                   │   │
│  │  • 会话管理                                                       │   │
│  │  • 限流控制                                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    OpenClaw Gateway                                │   │
│  │  • AI 对话处理                                                    │   │
│  │  • 技能执行                                                       │   │
│  │  • 工具调用                                                       │   │
│  │  • 记忆系统                                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   回复用户    │          │   回复用户    │          │   回复用户    │
│   (原渠道)   │          │   (原渠道)   │          │   (原渠道)   │
└───────────────┘          └───────────────┘          └───────────────┘
```

### 2.2 消息流程

```
用户发送消息 → 适配器接收 → 消息标准化 → 消息总线
                                              ↓
                                      OpenClaw Gateway
                                              ↓
                                              AI 处理
                                              ↓
                                        生成回复
                                              ↓
              适配器发送 ← 消息总线 ← 回复消息格式化 ←
```

---

## 3. 统一消息格式

### 3.1 标准化消息结构

```typescript
// 所有渠道消息统一转换为这个格式
interface UniversalMessage {
  // 消息 ID
  messageId: string;           // 全局唯一 ID

  // 用户信息
  user: {
    id: string;                // SynClaw 用户 ID
    imId: string;              // IM 平台用户 ID
    platform: IMPlatform;       // 平台类型
    username?: string;          // IM 用户名
    avatar?: string;            // IM 头像
  };

  // 会话信息
  session: {
    id: string;                 // SynClaw 会话 ID
    channelSessionId: string;   // IM 渠道会话 ID
    platform: IMPlatform;
  };

  // 消息内容
  content: {
    text: string;               // 纯文本
    raw?: unknown;              // 原始消息（平台特定）
    attachments?: Attachment[]; // 附件（图片/文件等）
  };

  // 元信息
  meta: {
    timestamp: number;           // 消息时间戳
    platform: IMPlatform;       // 来源平台
    mentions?: string[];        // @提及的用户
    replyTo?: string;           // 回复的消息 ID
  };
}

type IMPlatform =
  | 'feishu'      // 飞书
  | 'wecom'        // 企业微信
  | 'dingtalk'     // 钉钉
  | 'slack'        // Slack
  | 'discord'      // Discord
  | 'teams'        // Microsoft Teams
  | 'telegram'     // Telegram
  | 'whatsapp';    // WhatsApp
```

### 3.2 回复消息格式

```typescript
interface UniversalReply {
  messageId: string;           // 对应请求消息 ID
  userId: string;              // SynClaw 用户 ID
  content: {
    text: string;               // 回复文本
    images?: string[];          // 图片 URL
    attachments?: Attachment[];
    buttons?: Button[];         // 交互按钮（部分平台支持）
    mentions?: string[];         // @提及
  };
  meta: {
    timestamp: number;
    platform: IMPlatform;
    replyInThread?: boolean;     // 是否回复在线程中
  };
}
```

---

## 4. 渠道适配器设计

### 4.1 适配器接口

```typescript
// 每个渠道适配器必须实现这个接口
interface IMAdapter {
  // 平台标识
  readonly platform: IMPlatform;
  readonly displayName: string;

  // 生命周期
  initialize(config: ChannelConfig): Promise<void>;
  shutdown(): Promise<void>;

  // 接收消息
  onMessage(handler: (msg: UniversalMessage) => Promise<void>): void;

  // 发送消息
  send(reply: UniversalReply): Promise<void>;

  // 编辑消息（部分平台支持）
  edit(messageId: string, content: string): Promise<void>;

  // 删除消息（部分平台支持）
  delete(messageId: string): Promise<void>;

  // Webhook 验证（用于接收消息）
  verifyWebhook(request: Request): boolean | Promise<boolean>;

  // 获取用户信息
  getUserInfo(imId: string): Promise<UserInfo> | UserInfo;
}

// 渠道配置
interface ChannelConfig {
  channelId: string;            // SynClaw 渠道 ID
  userId: string;               // SynClaw 用户 ID
  credentials: {
    // 平台特定的凭证
    [key: string]: string;
  };
  settings: ChannelSettings;    // 渠道特定设置
}

interface ChannelSettings {
  enabled: boolean;
  mentionsOnly?: boolean;       // 只响应 @提及
  prefixCommands?: string[];     // 命令前缀（如 "/"）
  autoReply?: boolean;          // 是否自动回复
  notifications?: NotificationConfig;
}
```

### 4.2 适配器实现清单

| 渠道 | 适配器 | 实现方式 | 难度 |
|------|--------|---------|------|
| 飞书 | `FeishuAdapter` | 飞书开放平台 Bot SDK | ⭐⭐ |
| 企业微信 | `WeComAdapter` | 企业微信应用消息 API | ⭐⭐⭐ |
| 钉钉 | `DingTalkAdapter` | 钉钉开放平台 SDK | ⭐⭐⭐ |
| Slack | `SlackAdapter` | Slack Bolt SDK | ⭐⭐ |
| Discord | `DiscordAdapter` | Discord.js | ⭐⭐ |
| Microsoft Teams | `TeamsAdapter` | Microsoft Bot Framework | ⭐⭐⭐⭐ |
| Telegram | `TelegramAdapter` | Telegram Bot API | ⭐ |
| WhatsApp | `WhatsAppAdapter` | WhatsApp Business API | ⭐⭐⭐⭐ |

---

## 5. 飞书适配器详解

### 5.1 飞书 Bot 配置

```
飞书开放平台 → 创建企业自建应用 → 添加「机器人」能力

配置项:
├── App ID: cli_xxxxxxxx
├── App Secret: ********************
├── 机器人名称: SynClaw
├── 机器人描述: 你的桌面 AI 伙伴
└── 权限配置:
    ├── im:chat (读取消息)
    ├── im:message (发送消息)
    └── im:message.receive_v1 (接收消息)
```

### 5.2 Webhook 接收消息

```typescript
// 飞书消息事件订阅
POST /api/webhooks/feishu

Headers:
  X-Lark-Signature: sha256=xxxxx  // 签名验证

Body (飞书事件推送):
{
  "schema": "2.0",
  "header": {
    "event_id": "evt_xxxxxxxx",
    "event_type": "im.message.receive_v1",
    "create_time": "2026-03-20 10:00:00",
    "token": "xxxxx",
    "app_id": "cli_xxxxxxxx",
    "tenant_key": "tenant_xxxxxxxx"
  },
  "event": {
    "sender": {
      "sender_id": { "open_id": "ou_xxxxxxxx" },
      "sender_type": "user",
      "tenant_key": "tenant_xxxxxxxx"
    },
    "message": {
      "message_id": "om_xxxxxxxx",
      "root_id": "om_xxxxxxxx",
      "parent_id": "om_xxxxxxxx",
      "create_time": "2026-03-20 10:00:00",
      "chat_id": "oc_xxxxxxxx",
      "message_type": "text",
      "content": "{\"text\":\"@SynClaw 帮我整理今天的会议纪要\"}"
    }
  }
}
```

### 5.3 发送消息

```typescript
// 使用飞书 API 发送消息
POST https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id

Headers:
  Authorization: Bearer <tenant_access_token>

Body:
{
  "receive_id": "ou_xxxxxxxx",  // 用户 open_id
  "msg_type": "text",
  "content": JSON.stringify({
    "text": "好的，正在整理今天的会议纪要..."
  })
}
```

---

## 6. 企业微信适配器详解

### 6.1 企业微信配置

```
企业微信管理后台 → 应用管理 → 创建应用

配置项:
├── AgentId: 1000001
├── Secret: ********************
├── 企业 ID: wwxxxxxxxx
└── API 接收消息配置:
    ├── URL: https://your-domain.com/api/webhooks/wecom
    ├── Token: xxxxxx
    └── EncodingAESKey: xxxxxxxxxxxxxxx
```

### 6.2 消息接收

```typescript
// 企业微信回调消息格式
// 支持两种模式: 兼容模式 / 安全模式

POST /api/webhooks/wecom

// 兼容模式 (明文)
Body:
<xml>
  <ToUserName><![CDATA[SynClaw]]></ToUserName>
  <FromUserName><![CDATA[user_openid]]></FromUserName>
  <CreateTime>1710912000</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[@SynClaw 帮我整理文件]]></Content>
  <MsgId>1234567890</MsgId>
</xml>
```

---

## 7. 消息路由设计

### 7.1 路由器

```typescript
class MessageRouter {
  // 注册适配器
  registerAdapter(adapter: IMAdapter): void;

  // 路由消息
  async route(platform: IMPlatform, rawMessage: unknown): Promise<void>;

  // 用户订阅渠道
  async subscribe(userId: string, platform: IMPlatform, config: ChannelConfig): Promise<void>;

  // 用户取消订阅
  async unsubscribe(userId: string, platform: IMPlatform): Promise<void>;

  // 获取用户的活跃渠道
  getActiveChannels(userId: string): IMPlatform[];
}
```

### 7.2 会话管理

```typescript
// IM 会话与 OpenClaw 会话映射
interface SessionMapping {
  userId: string;
  imPlatform: IMPlatform;
  channelSessionId: string;      // IM 渠道的会话 ID（如飞书群 ID）
  openClawSessionKey: string;     // OpenClaw 会话 Key

  // 上下文管理
  context: {
    recentMessages: UniversalMessage[];  // 最近 N 条消息
    lastActive: number;                  // 最后活跃时间
  };
}
```

### 7.3 限流设计

```typescript
// 限流策略
interface RateLimit {
  // 每分钟消息数限制
  perMinute: number;
  // 每小时消息数限制
  perHour: number;
  // 每用户并发限制
  concurrentPerUser: number;
}

// 各渠道默认限流
const DEFAULT_RATE_LIMITS: Record<IMPlatform, RateLimit> = {
  feishu: { perMinute: 60, perHour: 1000, concurrentPerUser: 5 },
  wecom: { perMinute: 60, perHour: 1000, concurrentPerUser: 5 },
  dingtalk: { perMinute: 60, perHour: 1000, concurrentPerUser: 5 },
  slack: { perMinute: 60, perHour: 1000, concurrentPerUser: 5 },
  discord: { perMinute: 60, perHour: 1000, concurrentPerUser: 5 },
  teams: { perMinute: 60, perHour: 1000, concurrentPerUser: 5 },
  telegram: { perMinute: 30, perHour: 500, concurrentPerUser: 3 },
  whatsapp: { perMinute: 20, perHour: 200, concurrentPerUser: 2 },
};
```

---

## 8. OpenClaw Gateway 集成

### 8.1 渠道事件

```typescript
// OpenClaw Gateway 已有的渠道相关方法
// 参考: DEVELOPMENT_GUIDELINES.md

// 渠道状态
await client.request('channels.status', { userId });

// 渠道配置
await client.request('channels.configure', {
  channel: 'feishu',
  config: { appId, appSecret, webhookUrl }
});

// 发送消息（通过 Gateway 路由到对应渠道）
await client.request('channels.send', {
  channel: 'feishu',
  recipient: 'ou_xxxx',
  message: { text: 'Hello!' }
});
```

### 8.2 消息处理流程

```
IM 适配器接收消息
        ↓
消息标准化 (UniversalMessage)
        ↓
调用 OpenClaw Gateway
  await client.request('agent', {
    message: universalMessage.content.text,
    sessionKey: sessionMapping.openClawSessionKey,
    context: {
      platform: universalMessage.meta.platform,
      channelSessionId: universalMessage.session.channelSessionId,
      attachments: universalMessage.content.attachments
    }
  })
        ↓
Gateway 处理消息（AI 对话 + 工具调用）
        ↓
生成回复
        ↓
通过对应 IM 适配器发送回复
```

---

## 9. 用户配置体验

### 9.1 连接飞书 Bot

```
用户操作流程:

1. 进入客户 Portal → IM 渠道
   ┌─────────────────────────────────────────────────────┐
   │  IM 渠道配置                                          │
   │  ────────────────────────────────────────────────  │
   │                                                       │
   │  💬 飞书 Bot                      ⏳ 未连接          │
   │                                                       │
   │  [连接飞书]                                           │
   └─────────────────────────────────────────────────────┘

2. 点击「连接飞书」，弹出引导
   ┌─────────────────────────────────────────────────────┐
   │  连接飞书 Bot                                        │
   │  ────────────────────────────────────────────────  │
   │                                                       │
   │  步骤 1: 在飞书开放平台创建应用                        │
   │  → 打开飞书开放平台 → 创建企业自建应用 → 添加机器人能力 │
   │  [我已完成，复制 App ID]                             │
   │                                                       │
   │  步骤 2: 填写配置信息                                  │
   │  App ID: [cli_xxxxxxxx                       ]      │
   │  App Secret: [••••••••••••                    ]      │
   │                                                       │
   │  步骤 3: 配置 Webhook URL                             │
   │  将以下 URL 配置到飞书应用:                           │
   │  https://your-domain.com/api/webhooks/feishu         │
   │  [已配置]                                             │
   │                                                       │
   │                                    [保存并连接]        │
   └─────────────────────────────────────────────────────┘

3. 连接成功
   ┌─────────────────────────────────────────────────────┐
   │  ✅ 飞书 Bot 已连接                                  │
   │  ────────────────────────────────────────────────  │
   │                                                       │
   │  在飞书任意聊天窗口 @SynClaw 即可开始对话              │
   │                                                       │
   │  专属 Bot: SynClaw                                   │
   │  状态: 🟢 运行中                                     │
   │                                                       │
   │  [发送测试消息]  [查看配置]  [断开连接]               │
   └─────────────────────────────────────────────────────┘
```

---

## 10. 接入优先级

### Phase 1: 国内三件套（上线后 2-3 个月）

```
接入顺序: 飞书 → 企业微信 → 钉钉

原因:
• 用户主要在国内
• 飞书/企微/钉钉是主流 IM
• 技术相对成熟，文档完善

预计工时:
• 飞书: ~1 周
• 企业微信: ~1.5 周
• 钉钉: ~1.5 周
```

### Phase 2: 海外 IM（上线后 4-6 个月）

```
接入顺序: Telegram → Slack → Discord → Teams

原因:
• Telegram 最简单，先做
• Slack/Discord 有大量开发者用户
• Teams 企业用户较多

预计工时:
• Telegram: ~3 天
• Slack: ~1 周
• Discord: ~1 周
• Teams: ~2 周 (Microsoft 生态复杂)
```

### Phase 3: WhatsApp（上线后 6 个月+）

```
WhatsApp Business API 限制较多:
• 需要 Facebook Business 账户
• 需要通过官方审核
• 消息模板有限制
• 成本较高

建议:
• 后期考虑
• 可先做 Telegram 作为替代
```

---

## 11. 技术实现

### 11.1 项目结构

```
synclaw/
├── server/
│   └── src/
│       ├── channels/              # IM 渠道模块
│       │   ├── index.ts          # 统一导出
│       │   ├── router.ts         # 消息路由器
│       │   ├── types.ts          # 通用类型定义
│       │   ├── adapters/         # 各渠道适配器
│       │   │   ├── feishu.ts
│       │   │   ├── wecom.ts
│       │   │   ├── dingtalk.ts
│       │   │   ├── slack.ts
│       │   │   ├── discord.ts
│       │   │   ├── teams.ts
│       │   │   ├── telegram.ts
│       │   │   └── whatsapp.ts
│       │   ├── middleware/       # 中间件
│       │   │   ├── rateLimit.ts
│       │   │   ├── auth.ts
│       │   │   └── validator.ts
│       │   └── webhooks/          # Webhook 处理
│       │       ├── feishu.ts
│       │       ├── wecom.ts
│       │       └── ...
│       │
│       └── api/                   # API 路由
│           └── channels/
│               ├── index.ts      # 渠道列表
│               ├── connect.ts    # 连接渠道
│               └── disconnect.ts # 断开渠道
│
├── gateway/                       # OpenClaw Gateway
│   └── src/
│       └── channels/             # Gateway 侧渠道支持
```

### 11.2 依赖

```json
{
  "dependencies": {
    // 飞书
    "@larksuiteoapi/node-sdk": "^1.10.0",
    // 企业微信
    "wecom-sdk": "^1.0.0",
    // 钉钉
    "@dingtalk-robot/sdk": "^1.5.0",
    // Slack
    "@slack/bolt": "^3.18.0",
    // Discord
    "discord.js": "^14.14.0",
    // Telegram
    "node-telegram-bot-api": "^0.64.0",
    // Microsoft Teams
    "@microsoft/adaptivecards-tools": "^1.4.0"
  }
}
```

---

## 12. 监控与告警

### 12.1 监控指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| 消息接收量 | 各渠道每秒/分/小时消息数 | - |
| 消息发送成功率 | 各渠道发送成功率 | < 95% |
| 响应延迟 | P50/P95/P99 | > 5s |
| 错误率 | 各渠道错误率 | > 1% |
| 限流触发次数 | 限流触发统计 | > 100/小时 |
| Webhook 调用量 | 各渠道 Webhook 调用量 | - |

### 12.2 告警策略

```
告警级别:
├── P0 (紧急): 渠道完全不可用 → 立即通知
├── P1 (高): 错误率 > 5% → 30分钟内响应
├── P2 (中): 响应延迟 > 10s → 2小时内响应
└── P3 (低): 监控提醒 → 工作时间处理
```

---

## 13. 成本估算

### 13.1 各渠道成本

| 渠道 | API 成本 | 备注 |
|------|---------|------|
| 飞书 | ¥0 | 企业自建应用免费 |
| 企业微信 | ¥0 | 企业内部应用免费 |
| 钉钉 | ¥0 | 基础功能免费 |
| Slack | $0 | Bot 用户免费 |
| Discord | $0 | Bot 免费 |
| Teams | $0 | Azure AD 应用免费 |
| Telegram | $0 | Bot API 免费 |
| WhatsApp | $0.05-0.15/消息 | Business API 按消息计费 |

### 13.2 服务器成本

```
IM 渠道服务:
├── 独立服务器/容器
│   ├── CPU: 2 核
│   ├── 内存: 4GB
│   ├── 流量: 1TB/月
│   └── 成本: ~$20/月
│
├── Webhook 接收服务
│   ├── 多区域部署
│   ├── CDN 加速
│   └── 成本: ~$30/月
│
└── 总计: ~$50/月
```

---

## 14. 测试策略

### 14.1 单元测试

- 各适配器消息标准化
- 限流逻辑
- 会话映射逻辑

### 14.2 集成测试

- 各渠道 Webhook 端点
- 与 OpenClaw Gateway 集成
- 端到端消息流

### 14.3 灰度发布

```
新渠道上线流程:
1. 内部测试 (员工) → 1 周
2. Beta 用户测试 → 2 周
3. 5% 用户灰度 → 1 周
4. 全量发布
```

---

*文档版本：v1.0*
*最后更新：2026-03-20*

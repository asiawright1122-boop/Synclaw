# 遗留项 PLAN — v1.1 已全部完成

**Created:** 2026-03-27
**Updated:** 2026-03-30
**Goal:** 解决 v1.1 遗留的 3 个主要项
**Status:** All Done

---

## 遗留项总览

| # | 遗留项 | 状态 | 原因 |
|---|--------|------|------|
| R-1 | `SettingsView.tsx` 巨石拆分（3213行） | **✅ 已完成** | 3215行 → 191行主壳 + 13个面板组件 + shared/ |
| R-2 | Sandbox 对接（OpenClaw 安全隔离） | **已完成** | 三层安全配置通过 gateway-bridge.ts `applySecurityConfig()` |
| R-3 | Control UI 内置入口 | **已完成** | GatewayPanel 添加"控制面板"按钮 |
| **C** | `limitAccess` 配置传播修复 | **✅ 已完成** | `applySecurityConfig` 动态读取 + store 订阅重刷 |

---

## R-1: SettingsView.tsx 巨石拆分

### 问题诊断

`SettingsView.tsx` 目前 **3213 行**，包含：
- 14 个面板函数（嵌入同一文件）
- 1 个 `pillBtn` 辅助函数
- 1 个 `ExternalLinkMini` 辅助组件
- 1 个主 `SettingsView` 导出组件
- CSS 内联样式在每个面板内重复

**面板结构（已摸清）：**

| 面板 | 行范围 | 行数 | 现状 | 拆分后路径 |
|------|--------|------|------|-----------|
| `GeneralPanel` | 84–224 | 140 | 已可独立 | ✅ 可直接拆分 |
| `UsagePanel` | 225–368 | 143 | 已可独立 | ✅ 可直接拆分 |
| `PointsPanel` | 369–554 | 185 | 已可独立 | ✅ 可直接拆分 |
| `ModelsPanel` | 555–900 | 345 | 已可独立 | ✅ 可直接拆分 |
| `MemoryPanel` | 901–1277 | 376 | 已可独立 | ✅ 可直接拆分 |
| `HooksPanel` | 1278–1694 | 416 | 已可独立 | ✅ 可直接拆分 |
| `McpPanel` | 1695–2272 | 577 | 已可独立 | ✅ 可直接拆分 |
| `SkillsPanel` | 2273–2488 | 215 | 已可独立 | ✅ 可直接拆分 |
| `WorkspacePanel` | 2489–2650 | 161 | 已可独立 | ✅ 可直接拆分 |
| `GatewayPanel` | 2651–2848 | 197 | 已可独立 | ✅ 可直接拆分 |
| `PrivacyPanel` | 2849–2977 | 128 | 已可独立 | ✅ 可直接拆分 |
| `FeedbackPanelWrapper` | 2988–2998 | 10 | 已可独立 | ✅ 可直接拆分 |
| `AboutPanel` | 2999–~3099 | ~100 | 已可独立 | ✅ 可直接拆分 |
| **SettingsView 主视图** | 3102–~3213 | ~111 | 路由逻辑 | ✅ 拆分后 ~110行 |

**另外 3 个面板已独立文件：**
- `AuthorizedDirsPanel` → `src/renderer/components/AuthorizedDirsPanel.tsx` ✅
- `SkillsMarketPanel` → `src/renderer/components/SkillsMarketPanel.tsx` ✅
- `ImPanel` → `src/renderer/components/IMPanel.tsx` ✅

### 拆分方案：零破坏迁移

**Phase A：创建目录结构（无变更）**
```
src/renderer/components/settings/
├── index.ts                    ← 重导出所有面板 + SettingsView（无实质逻辑）
├── SettingsView.tsx            ← 主视图（路由逻辑，仅 ~110行）
├── panels/
│   ├── GeneralPanel.tsx
│   ├── UsagePanel.tsx
│   ├── PointsPanel.tsx         ← 云服务，待删除
│   ├── ModelsPanel.tsx
│   ├── MemoryPanel.tsx
│   ├── HooksPanel.tsx
│   ├── McpPanel.tsx
│   ├── SkillsPanel.tsx
│   ├── WorkspacePanel.tsx
│   ├── GatewayPanel.tsx
│   ├── PrivacyPanel.tsx
│   ├── FeedbackPanel.tsx
│   └── AboutPanel.tsx
└── shared/
    ├── SettingsLayout.tsx      ← 共享布局（侧边栏 + 内容区）
    ├── SettingsNav.tsx        ← 导航菜单
    └── pillBtn.tsx            ← pillBtn 样式辅助
```

**Phase B：逐个拆分（每个面板独立 commit）**
按行数从少到多拆分，降低破坏风险：
1. `FeedbackPanel` (10行) → 练习题
2. `GeneralPanel` (140行)
3. `PrivacyPanel` (128行)
4. `AboutPanel` (~100行)
5. `UsagePanel` (143行)
6. `WorkspacePanel` (161行)
7. `PointsPanel` (185行)
8. `GatewayPanel` (197行)
9. `SkillsPanel` (215行)
10. `ModelsPanel` (345行)
11. `MemoryPanel` (376行)
12. `HooksPanel` (416行)
13. `McpPanel` (577行) — 最大面板最后拆
14. `SettingsView` 主视图 (110行)

**Phase C：删除废弃代码**
- 确认各 `IMPanel`、`CreditsPanel`、`SubscriptionPanel` 是否仍被引用
- 清理 `case 'im'`, `case 'points'` 等云服务面板

### 验收标准

| 指标 | 目标 |
|------|------|
| `SettingsView.tsx` 行数 | < 150 行 |
| 每个 panel 文件行数 | < 500 行（最大 McpPanel） |
| `tsc --noEmit` | 零错误 |
| 运行时面板功能 | 所有 14 个面板切换正常 |
| `src/renderer/components/SettingsView.tsx` | 变为重导出壳（≤ 10行） |

### 风险与缓解

| 风险 | 缓解 |
|------|------|
| 拆分时破坏 `useSettingsStore` 订阅 | 每个面板独立拆分后验证 |
| CSS 样式丢失 | 保留所有 `className`，组件独立后样式不变 |
| 大量 git diff 难以 review | 每个面板单独 commit |
| 破坏 `settingsSection` 导航 | `SettingsView` 路由逻辑保持不变 |

---

## R-2: Sandbox 对接

### 问题

SynClaw 目前仅靠路径白名单（`BLOCKED_PATHS`）保护，OpenClaw 的内置 Sandbox 功能未对接。CVE 风险：exec 逃逸白名单。

### 方案

对接 OpenClaw `sandbox` 配置到 `gateway.ts`（或 `gateway-bridge.ts`），在 Gateway 启动参数中传递 sandbox 配置：

**研究路线：**
1. 检查 `openclaw-source/src/gateway/` 中的 sandbox 配置格式
2. 找到 `GatewayClientOptions` 或 `GatewayBridgeOptions` 中的 sandbox 字段
3. 确定 sandbox 的 Node.js/Docker 模式

**目标配置（来自 SECURITY.md 基线）：**
```json5
{
  sandbox: {
    mode: "non-main",           // 在非主进程中运行工具
    docker: {
      network: "none",           // 禁用网络
      readOnlyRoot: true,       // 只读根目录
    }
  }
}
```

### 验收标准

| 指标 | 目标 |
|------|------|
| sandbox 配置 | 可通过 Gateway config API 查询 |
| exec 工具 | 在非主进程中执行 |
| 网络访问 | 沙箱内禁止 |

---

## R-3: Control UI 内置入口

### 问题

OpenClaw 内置了 Control UI（`http://localhost:18789/openclaw`），但 SynClaw 没有提供入口。

### 方案

**选项 A（推荐）：** 在 Settings 中添加 "OpenClaw 控制面板" 入口按钮
- 位置：`GatewayPanel` 或 `AboutPanel`
- 点击：调用 `shell.openExternal('http://localhost:18789/openclaw')`
- 前提：Gateway 已连接（`connected === true`）

**选项 B：** 在 Header 添加 "控制台" 按钮
- 更显眼，但增加 UI 复杂度

### 验收标准

| 指标 | 目标 |
|------|------|
| GatewayPanel 中的控制台按钮 | Gateway 连接时显示，断开时禁用 |
| 点击打开 Control UI | 在浏览器中打开对应 URL |

---

## 执行顺序

全部完成！
- R-1 ✅ SettingsView.tsx 拆分（2026-03-30）
- R-2 ✅ Sandbox 对接（gateway-bridge.ts）
- R-3 ✅ Control UI 入口（GatewayPanel）
- C ✅ limitAccess 配置传播修复（applySecurityConfig 动态 + store 订阅）

---

## C: limitAccess 配置传播修复

### 问题诊断

`applySecurityConfig()` 在 `connect()` 时仅执行一次，且 `limitAccess` 硬编码为 `true`：
- 用户在 WorkspacePanel 中切换 limitAccess 开关 → electron-store 正确更新
- 但 Gateway 的 `config.patch` 配置不会重新推送 → 沙箱策略无变化

### 修复内容

1. **`gateway-bridge.ts`** — `applySecurityConfig` 改为动态读取 `getAppSettings().workspace.limitAccess`，不再硬编码
2. **`gateway-bridge.ts`** — 新增 `refreshSecurityConfig()` 公开方法，供外部触发重推
3. **`index.ts`** — `setupSettingsBridge()` 订阅 electron-store 的 `onDidChange('workspace.limitAccess')`，Gateway 已连接时调用 `bridge.refreshSecurityConfig()`

### 验收标准

| 指标 | 目标 |
|------|------|
| `applySecurityConfig` | 实时读取 `limitAccess`，不再硬编码 |
| `refreshSecurityConfig` | 切换 limitAccess 后 Gateway 配置实时更新 |
| IPC 文件操作（`file:read` 等） | 实时读取 `limitAccess` ✅（已确认） |

---

## 依赖

| 任务 | 前置条件 |
|------|---------|
| R-3 | Gateway 连接状态已知（`useOpenClawStore` 已有） |
| R-2 | OpenClaw sandbox API 研究 |
| R-1 | 14 个面板依赖的 store/hook 保持稳定 |

---

*Last updated: 2026-03-27*

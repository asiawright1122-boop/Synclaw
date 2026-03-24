# ROADMAP.md — SynClaw v1.0 MVP

**Milestone:** v1.0 MVP
**Created:** 2026-03-24
**Core Value:** 用户可以通过自然语言对话，安全地操作用户本地文件系统，且数据永不离开用户设备。

---

## Phase 1: 构建修复 — 消除运行时致命问题

**Goal:** 修复 OpenClaw Gateway 无法运行的致命问题，使 `pnpm run electron:dev` 可以正常启动。

**Requirements:** BUILD-01, BUILD-02, BUILD-03

**Success Criteria:**
1. `pnpm run electron:dev` 成功启动，无 "dist/entry.js not found" 错误
2. Node.js 版本检查在启动时提示 >= 22.12.0
3. `file:unwatch` API 可正常调用（preload 和 ipc-handlers 均已实现）
4. TypeScript 编译零错误
5. 主进程构建通过

**UI hint:** no

---

## Phase 2: 首次启动引导 — 0→1 的用户体验

**Goal:** 用户首次安装后，能顺利完成 API Key 配置和授权目录选择。

**Requirements:** ONBD-01, ONBD-02, ONBD-03

**Success Criteria:**
1. 首次启动时显示引导流程，无空白/崩溃界面
2. 用户可输入 API Key 并验证连通性
3. 用户可选择授权目录（支持添加/移除/仅查看）
4. 引导完成后不再重复显示
5. Gateway 可用状态下 UI 有明确提示

**UI hint:** yes

---

## Phase 3: 文件安全与权限 — 可控的文件操作

**Goal:** 建立文件访问安全边界，用户明确控制哪些目录可被 AI 操作。

**Requirements:** FILE-01, FILE-02, FILE-03

**Success Criteria:**
1. `../` 路径穿越请求被阻止，返回明确错误
2. 系统敏感目录（`/etc`, `/usr`, `C:\Windows` 等）访问被拒绝
3. 用户可在设置中动态添加/移除授权路径
4. 未授权目录的访问请求显示清晰的权限拒绝提示
5. 授权目录列表持久化，重启后保持

**UI hint:** yes

---

## Phase 4: 技能市场 UI — 技能生态入口

**Goal:** 提供可视化的技能浏览和安装体验，让用户发现并使用 ClawHub 技能。

**Requirements:** SKIL-01, SKIL-02, SKIL-03

**Success Criteria:**
1. 技能市场页面展示卡片列表，支持分类和搜索
2. 点击技能卡片显示详情（含描述、配置项）
3. 一键安装后技能出现在技能面板
4. 安装/卸载有明确的加载态和结果反馈
5. 技能安装状态（已安装/未安装）在列表中清晰区分

**UI hint:** yes

---

## Phase 5: 正式打包发布 — 可分发的应用

**Goal:** 生成用户可直接安装的跨平台安装包，完成 v1.0 MVP 发布。

**Requirements:** PACK-01, PACK-02, PACK-03, PACK-04

**Success Criteria:**
1. macOS: `.dmg` 文件生成，含代码签名（若证书存在）
2. Windows: `.exe` (NSIS) 安装包生成
3. Linux: `.AppImage` 生成
4. GitHub Actions release workflow 可从 tag 自动触发构建并发布
5. `release/` 目录包含所有平台安装包
6. GitHub Releases 页面包含版本说明和下载链接

**UI hint:** no

---

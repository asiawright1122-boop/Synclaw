# SynClaw 产品深度审查报告

> 审查视角：产品经理（PM）、UX 评审员
> 审查时间：v1.0 MVP 阶段（Phase 4 完成）
> 审查方法：代码走读 + 用户旅程分析 + 竞品对比

---

## 一、执行摘要

**项目评级：A-**（优秀，有关键缺口需在发布前修复）

SynClaw 的核心价值主张清晰——"本地 AI 助手，数据永不离开设备"。Electron + OpenClaw Gateway 架构合理，技术栈现代，实现质量高。UX 设计有品味，Onboarding 引导、命令面板、文件浏览器等核心功能均有良好的交互细节。

**当前 MVP 完成度：80%**

| 维度 | 状态 | 说明 |
|------|------|------|
| 核心对话 | ✅ | 流式输出、停止、重发 |
| 首次引导 | ✅ | API Key + 授权目录 |
| 文件浏览器 | ✅ | 有授权边界检查 |
| 系统托盘 | ✅ | 点击隐藏、动态菜单 |
| 命令面板 | ✅ | Ctrl+K、分类命令 |
| 技能市场 | ⚠️ | UI 完成，ClawHub 集成缺失 |
| 助手配置 | ⚠️ | Avatar 体系未落地 |
| 设置面板 | ⚠️ | Privacy Panel 有 bug |
| 文件安全 | ❌ | OpenClaw 后端未 enforcement |
| 对话历史 | ❌ | 刷新即丢失 |
| Markdown 渲染 | ❌ | AI 回复无格式 |
| 技能安装 | ⚠️ | Shell 命令注入风险 |

---

## 二、竞品分析

| 维度 | Claude Code | Cursor | SynClaw（当前） | SynClaw（目标） |
|------|-----------|--------|----------------|----------------|
| 平台 | CLI | Electron | **Electron** | Electron |
| 隐私 | 纯本地 | 部分云 | **本地 Gateway** | 本地 Gateway |
| 系统托盘 | ❌ | ⚠️ 基础 | **✅ 完善** | 完善 |
| 文件授权 | ✅ | ✅ | ❌ 后端缺失 | ✅ |
| 多 Agent | ❌ | ❌ | ⚠️ Avatar 未落地 | Avatar 体系 |
| 技能市场 | 插件生态 | Extensions | ⚠️ 骨架 | 完整 ClawHub |
| TTS | ❌ | ❌ | ❌ 缺失 | 内置 |
| 对话历史 | 文件 | 文件 | ❌ | 本地持久化 |
| 协作 | ❌ | ⚠️ Cursor Rules | ❌ | 规划中 |

**差异化机会：**
- 本地文件安全沙箱（这是竞品最弱的点，但也是 SynClaw 当前最不完整的点）
- 多分身 IM + Agent 并行（Avatar 体系）
- 技能市场 ClawHub 生态

---

## 三、UX 成熟度评估

### 3.1 Onboarding（成熟度：85%）
**做得好的：**
- 三步骤清晰，进度指示器直观
- Gateway 状态实时反馈（检查中/已就绪/连接失败）
- 跳过机制合理
- Step 3 完成汇总展示

**缺口：**
- `authorizedDirs` 初始值从 store 读取有 bug（已修复）
- 没有"重新引导"入口（用户重置设置后无法再次触发）
- 引导完成后没有给出"接下来做什么"的上手建议

### 3.2 ChatView（成熟度：70%）
**做得好的：**
- 流式输出动画
- 停止按钮（红色停止符）
- 附件支持（图片预览）
- 模型选择菜单
- 输入框自动增高

**缺口（按优先级）：**
- **P0**: AI 回复无 Markdown 渲染（纯文本显示代码块、链接）
- **P0**: 对话历史不持久化（刷新页面全部丢失）
- **P1**: 消息复制按钮缺失（用户需要选中文字）
- **P1**: 打字指示器（AI 思考中只有 loading spinner，缺少"正在思考..."文字）
- **P2**: 长消息展开/折叠

### 3.3 FileExplorer（成熟度：80%）
**做得好的：**
- 列表/网格双视图切换
- 收藏功能
- 键盘快捷键（Ctrl+N 新文件）
- 文件预览面板
- 右键菜单完整

**缺口（按优先级）：**
- **P0**: OpenClaw 后端无文件授权 enforcement（只在前端检查）
- **P1**: 主目录/回收站路径硬编码（已修复为 API 获取）
- **P1**: 没有"打开方式"功能（默认用系统应用打开文件）
- **P2**: 拖拽排序收藏夹
- **P2**: 没有搜索框（快速定位文件）

### 3.4 SkillsPanel（成熟度：65%）
**做得好的：**
- 分类筛选 + 搜索
- 详情 Drawer
- 安装/卸载/启用/禁用完整操作
- Gateway 连接状态指示
- API Key 配置入口
- 空状态引导（已改善）

**缺口（按优先级）：**
- **P0**: ClawHub API 集成缺失（只展示静态列表）
- **P1**: 技能安装进度不显示（只有按钮 loading）
- **P1**: 技能安装失败后的错误提示不够友好
- **P2**: 技能版本管理（升级/降级）
- **P2**: 技能搜索无网络结果（全部是本地缓存）

### 3.5 设置面板（成熟度：70%）
**做得好的：**
- 分 Tab 导航，切换流畅
- Workspace 配置同步到 Gateway
- 收藏目录管理
- 主题/字体大小实时预览

**缺口（按优先级）：**
- **P0**: Privacy Panel（优化计划选项）调用了错误的 API（`window.openclaw.settings` 而非 `window.electronAPI.settings`）——已修复
- **P1**: 没有"导入/导出设置"功能
- **P1**: 没有"重置所有设置"确认弹窗
- **P2**: 助手头像自定义（Avatar 体系未落地）

---

## 四、技术债务与风险

### 4.1 文件安全（P0 — 发布前必须解决）

**问题：** 授权目录白名单只在 React 前端实现了 `validatePath` 检查，OpenClaw Gateway 后端未验证。用户如果直接调用 Gateway 的 file API（绕过前端），可以访问任意路径。

**建议：**
1. 在 OpenClaw Gateway 添加文件路径验证中间件（检查 `limitAccess` + `authorizedDirs`）
2. 前端的 `validatePath` 仅作为 UX 层的快速反馈（节省不必要的 API 调用）
3. 在 FileExplorer UI 中，当 `authorizedDirs` 为空且 `limitAccess=true` 时，显示引导添加目录（替代当前的空白状态）

### 4.2 对话历史持久化（P0 — 发布前必须解决）

**问题：** 刷新页面后所有对话消息消失。虽然 `chatStore` 有 `saveHistory()` 方法，但需要确认 Gateway 是否实际存储了消息。

**建议：**
1. 在 ChatView 初始化时调用 `loadHistory()` 并处理空状态
2. 添加"对话历史"面板（左侧 Sidebar）
3. 确认 Gateway 的 session 持久化机制

### 4.3 Preload API 暴露风险（需评估）

**问题：** Preload 的 `electronAPI.file` 暴露了所有文件系统操作，包括可能危险的 `shell.openExternal`。目前无 CSP 策略限制。

**建议：**
1. 评估 `shell.openExternal` 的必要性，考虑移除或限制只允许特定 URL scheme
2. 添加 Content Security Policy

### 4.4 技能安装 Shell 注入（需修复）

**问题：** `ipc-handlers.ts` 中 `skill:install` 使用字符串拼接构建 shell 命令，存在注入风险。

**建议：** 使用参数化 API 而非 shell 字符串拼接。

---

## 五、已修复问题清单（本次审查修复）

| ID | 问题 | 修复方案 | 状态 |
|----|------|----------|------|
| WS-P0-01 | FileExplorer mock fallback 数据泄露隐私 | 移除 fallback，Gateway 不可用时显示错误 | ✅ |
| WS-P0-02 | FileExplorer 硬编码 `/Users/kaka` | 改用 `app.getPath('home')` API | ✅ |
| WS-P0-03 | FileExplorer 无授权目录边界检查 | 添加 `validatePath` 函数拦截越权访问 | ✅ |
| WS-P0-04 | appStore `currentModel` 硬编码 `GLM-4-Turbo` | 改为空字符串，由用户选择 | ✅ |
| WS-P0-05 | SettingsView PrivacyPanel 调用错误 API | 改为 `electronAPI.settings` | ✅ |
| WS-P1-08 | electron-store 多窗口不同步 | 添加 IPC `settings:changed` 广播 | ✅ |
| WS-P1-01 | Onboarding authorizedDirs 跳过后丢失 | 从 store 初始化 + useEffect 同步 | ✅ |
| WS-P1-09 | SkillsPanel 空列表无引导 | 区分"无技能"和"无搜索结果"两种空状态 | ✅ |
| WS-BUG-01 | `tray.ts` 遗留注释提到未实现 flag | 确认代码无实际问题（注释已理解） | ✅ |
| WS-TYPE-01 | `getPath('trash')` 缺失类型定义 | 添加 `'trash'` 到 ElectronAPI 类型 | ✅ |
| WS-TYPE-02 | tsconfig 未包含 `src/renderer/types/**/*` | 更新 include 配置 | ✅ |

---

## 六、剩余问题（按优先级）

### 发布前必须解决（P0）
| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| R01 | **OpenClaw 后端文件授权未 enforcement** | 数据泄露风险 | Gateway 添加路径验证中间件 |
| R02 | **对话历史不持久化** | 用户体验严重受损 | 实现 session 持久化 |
| R03 | **AI 回复无 Markdown 渲染** | 代码片段、链接等无法正常显示 | 集成 `react-markdown` 或 `marked` |

### 下一个迭代（M1）
| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| R04 | Avatar 体系未落地 | "多分身"核心价值无法体验 | 设计和实现 Avatar Store |
| R05 | ClawHub API 集成缺失 | 技能市场是空壳 | 对接 ClawHub REST API |
| R06 | 系统快捷键无自定义 | 高级用户无法配置 | 添加快捷键设置面板 |
| R07 | 技能安装无进度显示 | 用户不确定安装状态 | 添加安装进度状态 |

### 值得做但非紧急（R2）
| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| R08 | TTS 功能缺失 | 纯文字体验单一 | 集成 Web Speech API |
| R09 | 无导入/导出设置 | 用户无法备份配置 | 添加 JSON 导入/导出 |
| R10 | 无对话历史侧边栏 | 用户无法快速切换历史会话 | 添加 History 面板 |
| R11 | 文件预览仅文本 | 图片等媒体无法预览 | 添加图片预览支持 |

---

## 七、快速成功（Quick Wins）

以下改动可在 1-2 小时内完成，对用户体验提升明显：

1. **添加 Markdown 渲染**：`pnpm add react-markdown && rehype-highlight`，替换 ChatView 中的消息文本渲染
2. **对话历史持久化提示**：在 ChatView 添加"消息已保存"toast，让用户知道数据被保存了
3. **引导添加授权目录**：FileExplorer 在无授权目录时显示引导卡片而非空白
4. **技能安装成功反馈**：安装完成后弹出成功 toast
5. **打字指示器文字**：AI 思考中显示"正在思考..."而不是只有 spinner

---

## 八、架构健康度

| 维度 | 评分 | 说明 |
|------|------|------|
| IPC 通道设计 | 8/10 | 通道命名清晰，类型完整，broadcast 机制刚添加 |
| 状态管理 | 7/10 | Zustand 合理使用，Gateway 断连 fallback 到位 |
| 类型安全 | 8/10 | TypeScript 严格模式，零错误（本次修复后） |
| 错误处理 | 7/10 | 组件内 try/catch 到位，Gateway 错误有 toast |
| 代码组织 | 8/10 | 目录结构清晰，组件职责单一 |
| 测试覆盖 | 3/10 | 无单元测试，Playwright E2E 待完善 |
| CI/CD | 6/10 | GitHub Actions 配置已修复，但无自动化测试步骤 |

---

## 九、产品路线图建议

### v1.0 MVP（当前阶段）
**目标：** 可安全使用的基础版本
- [x] 首次引导
- [x] AI 对话（流式）
- [x] 文件浏览（有限制）
- [ ] 文件安全后端 enforcement
- [ ] 对话历史持久化

### v1.1（下一个迭代）
**目标：** 完整的本地 AI 助手
- [ ] Markdown 渲染
- [ ] Avatar 体系
- [ ] ClawHub 技能市场
- [ ] 对话历史侧边栏
- [ ] TTS 语音播报

### v1.2
**目标：** 高级特性
- [ ] 定时任务（Task 系统）
- [ ] 多人协作（会话分享）
- [ ] 插件系统
- [ ] 云端同步（可选，用户自控）

---

## 十、总结

SynClaw 是一个有清晰愿景和坚实技术基础的产品。核心价值——"本地 AI、数据不离开设备"——在当前实现中通过前端授权检查、系统托盘、Electron 沙箱体现，但关键的**文件安全后端 enforcement** 和**对话历史持久化**仍是重大缺口，发布前必须解决。

UX 层面，产品整体体验流畅、细节丰富（Framer Motion 动画、键盘快捷键、命令面板等），但缺少 Markdown 渲染和对话历史会让用户感觉功能不完整。

**建议：**
- 将 v1.0 MVP 的发布标准定义为"核心路径可安全使用"，而非"所有功能完善"
- 在发布前完成 R01（文件安全）和 R02（对话历史），其余进入 v1.1
- 在发布后 2 周内收集用户反馈，优先修复实际使用中发现的问题

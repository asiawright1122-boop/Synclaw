/**
 * 轻量国际化模块 — i18n/index.ts
 *
 * 中文为默认语言，支持英文备用。
 * 通过 `settingsStore` 扩展 language 偏好后可动态切换。
 *
 * 使用方式:
 *   import { t } from '../i18n'
 *   t('chat.placeholder')
 */

export type Locale = 'zh' | 'en'

const zh: Record<string, string> = {
  // ── ChatView 空态 ──────────────────────────────────────────────────────────
  'chat.banner.text': '29 元即享 5000 积分',
  'chat.banner.link': '去购买',
  'chat.title': 'SynClaw',
  'chat.subtitle': '描述你的目标，SynClaw 会分步执行并实时反馈',
  'chat.card.quick.title': '快速配置',
  'chat.card.quick.desc': '设置分身名称与角色，让 Agent 更贴合你的场景。',
  'chat.card.im.title': '一键接入 IM',
  'chat.card.im.desc': '连接飞书、企业微信等，在 IM 里直接使用分身。',
  'chat.placeholder': '发送给 SynClaw',
  'chat.attached': '附件',
  'chat.attachment.pick': '添加附件',
  'chat.attachment.remove': '移除附件',
  'chat.attachment.max': '最多 5 个附件',
  'chat.thinking': '思考中...',
  'chat.error.connection': '连接错误，请检查 OpenClaw Gateway 是否运行。',

  // ── ChatView 状态 ─────────────────────────────────────────────────────────
  'status.connected': '已连接',
  'status.ready': '就绪',
  'status.starting': '启动中',
  'status.idle': '空闲',
  'status.disconnected': '未连接',
  'status.error': '错误',
  'btn.connect': '连接',
  'btn.disconnect': '断开连接',
  'btn.send': '发送',
  'btn.stop': '停止',
  'btn.copy': 'Copy',
  'btn.copied': 'Copied',

  // ── Sidebar ────────────────────────────────────────────────────────────────
  'sidebar.tab.avatar': '分身',
  'sidebar.tab.chat': 'IM 频道',
  'sidebar.tab.task': '定时任务',
  'sidebar.avatar.new': '新建分身',
  'sidebar.avatar.empty': '暂无分身',
  'sidebar.avatar.retry': '重试',
  'sidebar.avatar.loading': '加载中...',
  'sidebar.chat.empty': '暂无频道',
  'sidebar.chat.search': '搜索频道...',
  'sidebar.task.new': '新建定时任务',
  'sidebar.task.empty': '暂无定时任务',
  'sidebar.task.retry': '重试',
  'sidebar.task.loading': '加载中...',
  'sidebar.settings': '设置',
  'sidebar.feedback': '反馈',
  'sidebar.user.loading': '加载中...',
  'sidebar.user.disconnected': '未连接',

  // ── Header ───────────────────────────────────────────────────────────────
  'header.title.avatar': '分身',
  'header.title.im': 'IM 频道',
  'header.title.task': '定时任务',
  'header.points.view': '查看积分详情',
  'header.points.recharge': '前往充值',
  'header.model.select': '加载中…',
  'header.avatar.select': '选择分身',
  'header.avatar.none': '暂无分身',
  'header.model.current': '当前',
  'header.model.configure': '模型配置',
  'header.model.temperature': 'Temperature',
  'header.model.topP': 'Top P',
  'header.model.topK': 'Top K',
  'header.model.maxTokens': '最大 Tokens',
  'header.model.thinking': '思考模式',
  'header.model.thinkingBudget': '思考预算',
  'header.model.saved': '已保存',

  // ── AvatarSelector ────────────────────────────────────────────────────────
  'avatar.online': '在线',
  'avatar.busy': '忙碌',
  'avatar.offline': '离线',

  // ── AvatarListPanel ─────────────────────────────────────────────────────────
  'avatar.list.search': '搜索分身...',
  'avatar.list.empty': '暂无分身，点击 + 创建',
  'avatar.list.delete': '删除分身',
  'avatar.list.deleteConfirm': '确定删除该分身？',
  'avatar.list.activate': '激活',
  'avatar.list.edit': '编辑',
  'avatar.list.demo': '演示模式 - 分身数据存储在本地',
  'avatar.list.noMatch': '未找到匹配的分身',
  'avatar.list.create': '创建第一个分身',

  // ── Onboarding ──────────────────────────────────────────────────────────────
  'onboarding.step1.title': '配置 AI 模型密钥',
  'onboarding.step1.subtitle': '输入你的 Anthropic API Key 以启用 AI 功能',
  'onboarding.step1.placeholder': 'sk-ant-...',
  'onboarding.step1.help': '如何获取 API Key？',
  'onboarding.step1.skip': '稍后配置',
  'onboarding.step2.title': '授权工作目录',
  'onboarding.step2.subtitle': '选择一个本地文件夹作为 SynClaw 的工作空间',
  'onboarding.step2.addDir': '添加目录',
  'onboarding.step2.dirError': '该目录已被添加',
  'onboarding.step2.gatewayError': '无法连接 OpenClaw Gateway',
  'onboarding.step3.title': '准备就绪！',
  'onboarding.step3.subtitle': 'SynClaw 已配置完成，开始使用吧',
  'onboarding.step3.complete': '开始使用',

  // ── ExecApprovalModal ───────────────────────────────────────────────────────
  'exec.title': '命令执行审批',
  'exec.deny': '拒绝',
  'exec.allowOnce': '仅允许一次',
  'exec.allowAlways': '始终允许',
  'exec.risky': '存在风险',
  'exec.sensitive': '含敏感信息',

  // ── Generic ───────────────────────────────────────────────────────────────
  'generic.loading': '加载中...',
  'generic.retry': '重试',
  'generic.delete': '删除',
  'generic.cancel': '取消',
  'generic.confirm': '确认',

  // ── FileExplorer ─────────────────────────────────────────────────────────
  'fileexplorer.preview.error': '无法预览此文件',
  'fileexplorer.newFile': '新建文件',
  'fileexplorer.newFolder': '新建文件夹',
  'fileexplorer.quickAccess': '快速访问',
  'fileexplorer.home': '主目录',
  'fileexplorer.trash': '回收站',
  'fileexplorer.tipFavorites': '右键文件即可收藏',
  'fileexplorer.selectFolder': '选择文件夹开始',
  'fileexplorer.clickOpen': '点击打开文件夹',
  'fileexplorer.folderName': '文件夹名称',
  'fileexplorer.fileName': '文件名',
  'fileexplorer.confirm': '↵ 确认 · Esc 取消',
  'fileexplorer.removeFavorite': '取消收藏',
  'fileexplorer.addFavorite': '收藏',
  'fileexplorer.preview': '预览',
  'fileexplorer.rename': '重命名',
  'fileexplorer.move': '移动到...',
  'fileexplorer.copyPath': '复制路径',
  'fileexplorer.showInFolder': '在文件夹中显示',
  'fileexplorer.delete': '删除',
}

const en: Record<string, string> = {
  // ── ChatView Empty State ─────────────────────────────────────────────────
  'chat.banner.text': 'Get 5000 credits for 29 RMB',
  'chat.banner.link': 'Buy Now',
  'chat.title': 'SynClaw',
  'chat.subtitle': 'Describe your goal, SynClaw will execute step by step with real-time feedback',
  'chat.card.quick.title': 'Quick Setup',
  'chat.card.quick.desc': 'Configure your avatar name and role to tailor the agent to your scenario.',
  'chat.card.im.title': 'One-Click IM Integration',
  'chat.card.im.desc': 'Connect to Feishu, WeCom, and more — use your avatar directly in IM.',
  'chat.placeholder': 'Send to SynClaw',
  'chat.attached': 'Attachments',
  'chat.attachment.pick': 'Add attachment',
  'chat.attachment.remove': 'Remove',
  'chat.attachment.max': 'Max 5 attachments',
  'chat.thinking': 'Thinking...',
  'chat.error.connection': 'Connection error. Please check if OpenClaw Gateway is running.',

  // ── ChatView Status ───────────────────────────────────────────────────────
  'status.connected': 'Connected',
  'status.ready': 'Ready',
  'status.starting': 'Starting',
  'status.idle': 'Idle',
  'status.disconnected': 'Disconnected',
  'status.error': 'Error',
  'btn.connect': 'Connect',
  'btn.disconnect': 'Disconnect',
  'btn.send': 'Send',
  'btn.stop': 'Stop',
  'btn.copy': 'Copy',
  'btn.copied': 'Copied',

  // ── Sidebar ───────────────────────────────────────────────────────────────
  'sidebar.tab.avatar': 'Avatars',
  'sidebar.tab.chat': 'IM Channels',
  'sidebar.tab.task': 'Scheduled Tasks',
  'sidebar.avatar.new': 'New Avatar',
  'sidebar.avatar.empty': 'No avatars',
  'sidebar.avatar.retry': 'Retry',
  'sidebar.avatar.loading': 'Loading...',
  'sidebar.chat.empty': 'No channels',
  'sidebar.chat.search': 'Search channels...',
  'sidebar.task.new': 'New Scheduled Task',
  'sidebar.task.empty': 'No scheduled tasks',
  'sidebar.task.retry': 'Retry',
  'sidebar.task.loading': 'Loading...',
  'sidebar.settings': 'Settings',
  'sidebar.feedback': 'Feedback',
  'sidebar.user.loading': 'Loading...',
  'sidebar.user.disconnected': 'Disconnected',

  // ── Header ────────────────────────────────────────────────────────────────
  'header.title.avatar': 'Avatar',
  'header.title.im': 'IM Channels',
  'header.title.task': 'Scheduled Tasks',
  'header.points.view': 'View Credits',
  'header.points.recharge': 'Recharge',
  'header.model.select': 'Loading...',
  'header.avatar.select': 'Select Avatar',
  'header.avatar.none': 'No avatars',
  'header.model.current': 'Active',
  'header.model.configure': 'Model Settings',
  'header.model.temperature': 'Temperature',
  'header.model.topP': 'Top P',
  'header.model.topK': 'Top K',
  'header.model.maxTokens': 'Max Tokens',
  'header.model.thinking': 'Thinking Mode',
  'header.model.thinkingBudget': 'Thinking Budget',
  'header.model.saved': 'Saved',

  // ── AvatarSelector ─────────────────────────────────────────────────────────
  'avatar.online': 'Online',
  'avatar.busy': 'Busy',
  'avatar.offline': 'Offline',

  // ── AvatarListPanel ─────────────────────────────────────────────────────────
  'avatar.list.search': 'Search avatars...',
  'avatar.list.empty': 'No avatars yet, click + to create',
  'avatar.list.delete': 'Delete avatar',
  'avatar.list.deleteConfirm': 'Are you sure you want to delete this avatar?',
  'avatar.list.activate': 'Activate',
  'avatar.list.edit': 'Edit',
  'avatar.list.demo': 'Demo mode — avatar data stored locally',
  'avatar.list.noMatch': 'No matching avatars found',
  'avatar.list.create': 'Create your first avatar',

  // ── Onboarding ──────────────────────────────────────────────────────────────
  'onboarding.step1.title': 'Configure AI Model Key',
  'onboarding.step1.subtitle': 'Enter your Anthropic API Key to enable AI features',
  'onboarding.step1.placeholder': 'sk-ant-...',
  'onboarding.step1.help': 'How to get an API Key?',
  'onboarding.step1.skip': 'Configure later',
  'onboarding.step2.title': 'Authorize Workspace Directory',
  'onboarding.step2.subtitle': 'Select a local folder as SynClaw workspace',
  'onboarding.step2.addDir': 'Add Directory',
  'onboarding.step2.dirError': 'This directory has already been added',
  'onboarding.step2.gatewayError': 'Cannot connect to OpenClaw Gateway',
  'onboarding.step3.title': "You're all set!",
  'onboarding.step3.subtitle': 'SynClaw is configured. Start using it now.',
  'onboarding.step3.complete': 'Start Using',

  // ── ExecApprovalModal ───────────────────────────────────────────────────────
  'exec.title': 'Command Execution Approval',
  'exec.deny': 'Deny',
  'exec.allowOnce': 'Allow once',
  'exec.allowAlways': 'Always allow',
  'exec.risky': 'Potentially risky',
  'exec.sensitive': 'Contains sensitive data',

  // ── Generic ───────────────────────────────────────────────────────────────
  'generic.loading': 'Loading...',
  'generic.retry': 'Retry',
  'generic.delete': 'Delete',

  // ── FileExplorer ─────────────────────────────────────────────────────────
  'fileexplorer.preview.error': 'Unable to preview this file',
  'fileexplorer.newFile': 'New File',
  'fileexplorer.newFolder': 'New Folder',
  'fileexplorer.quickAccess': 'Quick Access',
  'fileexplorer.home': 'Home',
  'fileexplorer.trash': 'Trash',
  'fileexplorer.tipFavorites': 'Right-click a file to favorite it',
  'fileexplorer.selectFolder': 'Select a folder to start',
  'fileexplorer.clickOpen': 'Click to open a folder',
  'fileexplorer.folderName': 'Folder name',
  'fileexplorer.fileName': 'File name',
  'fileexplorer.confirm': '↵ Confirm · Esc Cancel',
  'fileexplorer.removeFavorite': 'Remove from Favorites',
  'fileexplorer.addFavorite': 'Add to Favorites',
  'fileexplorer.preview': 'Preview',
  'fileexplorer.rename': 'Rename',
  'fileexplorer.move': 'Move to...',
  'fileexplorer.copyPath': 'Copy Path',
  'fileexplorer.showInFolder': 'Show in Folder',
  'fileexplorer.delete': 'Delete',
}

const translations: Record<Locale, Record<string, string>> = { zh, en }

let currentLocale: Locale = 'zh'

export function setLocale(locale: Locale) {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

/**
 * 翻译函数
 * @param key dot-notation key, e.g. 'chat.placeholder'
 * @param params 可选替换参数，e.g. { name: 'AutoClaw' }
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const value = translations[currentLocale][key] ?? translations['zh'][key] ?? key
  if (!params) return value
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, 'g'), String(v)),
    value
  )
}

/**
 * openclaw-gateway.ts
 *
 * GatewayClient 的运行时 shim。
 *
 * 背景：
 * openclaw npm 包的 "files" 字段只包含 dist/ 和 openclaw.mjs，不含 src/ 源码。
 * 因此在运行时，我们从 dist/method-scopes-*.js 动态导入 GatewayClient。
 * openclaw.mjs (dist/index.js) 是 CLI 入口，不是给 Node.js 模块导入用的。
 */

import { app } from 'electron'
import { join, dirname } from 'path'
import * as fs from 'fs'

function findOpenClawPath(startDir: string): string | null {
  let current = startDir
  for (let i = 0; i < 4; i++) {
    const candidate = join(current, 'resources', 'openclaw-source')
    if (fs.existsSync(candidate)) {
      return candidate
    }
    const parent = dirname(current)
    if (parent === current) {
      break
    }
    current = parent
  }
  return null
}

function getOpenClawPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedApp = app ?? (global as any).app
  if (resolvedApp && resolvedApp.isPackaged) {
    return join(process.resourcesPath!, 'openclaw-source')
  }
  if (resolvedApp && resolvedApp.getAppPath) {
    const appPath = resolvedApp.getAppPath()
    return (
      findOpenClawPath(appPath) ??
      findOpenClawPath(process.cwd()) ??
      join(appPath, 'resources', 'openclaw-source')
    )
  }
  return join(__dirname, '..', '..', 'resources', 'openclaw-source')
}

function findGatewayClientModule(): string {
  const openclawPath = getOpenClawPath()

  // 优先：从 dist/plugin-sdk/gateway-runtime.js 导入（推荐入口）
  const gatewayRuntime = join(openclawPath, 'dist/plugin-sdk/gateway-runtime.js')
  if (fs.existsSync(gatewayRuntime)) {
    return gatewayRuntime
  }

  // 备选：直接导入 method-scopes（包含 GatewayClient 类定义）
  const distDir = join(openclawPath, 'dist')
  const entries = fs.readdirSync(distDir)
  const methodScopes = entries.find(f => f.startsWith('method-scopes-') && f.endsWith('.js'))
  if (methodScopes) {
    return join(distDir, methodScopes)
  }

  // 兜底：dist/index.js
  return join(openclawPath, 'dist/index.js')
}

const gatewayModule = findGatewayClientModule()

// Lazy-loaded GatewayClient — resolves asynchronously on first access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _GatewayClient: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _GatewayClientOptions: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadGatewayClient(): Promise<any> {
  if (_GatewayClient !== null) {
    return Promise.resolve({ client: _GatewayClient, options: _GatewayClientOptions })
  }
  return import(gatewayModule).then((mod: any) => {
    _GatewayClient = mod.GatewayClient ?? mod.default?.GatewayClient
    _GatewayClientOptions = mod.GatewayClientOptions ?? mod.default?.GatewayClientOptions
    return { client: _GatewayClient, options: _GatewayClientOptions }
  })
}

export async function getGatewayClientClass(): Promise<any> {
  const { client } = await loadGatewayClient()
  if (!client) {
    throw new Error('[openclaw-gateway] GatewayClient not found in ' + gatewayModule)
  }
  return client
}

export async function getGatewayClientOptionsClass(): Promise<any> {
  const { options } = await loadGatewayClient()
  return options
}

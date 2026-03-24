#!/usr/bin/env node
/**
 * SynClaw 主进程构建脚本
 * 构建主进程和预加载脚本到 dist/
 */

import * as esbuild from 'esbuild'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_MAIN = path.join(ROOT, 'dist', 'main')
const DIST_PRELOAD = path.join(ROOT, 'dist', 'preload')

function checkNodeVersion() {
  const version = process.version.slice(1)
  const [major, minor = 0] = version.split('.').map(Number)
  if (major < 22 || (major === 22 && minor < 12)) {
    console.error(`Node.js 22.12.0+ required, got ${version}`)
    process.exit(1)
  }
  console.log(`Node.js ${version}`)
}

function ensureDistDirs() {
  fs.mkdirSync(DIST_MAIN, { recursive: true })
  fs.mkdirSync(DIST_PRELOAD, { recursive: true })
}

function buildMainProcess() {
  console.log('Building main process...')

  // openclaw-source 在 resources/ 目录下（与 client/ 同级）
  const openclawSourcePath = path.resolve(ROOT, 'resources', 'openclaw-source')
  // src/main/ 的绝对路径（用于替换相对导入）
  const mainSrcRoot = path.resolve(ROOT, 'src/main')

  const esmBanner = `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`.trim()

  // ── 动态注入：修改 gateway-bridge.ts ───────────────────────────────────
  // esbuild 的 define 只能替换标识符，无法替换字符串字面量中的相对路径。
  // 故在构建前直接修改源文件内容。
  const gatewayBridgePath = path.join(mainSrcRoot, 'gateway-bridge.ts')
  let gatewayBridgeSource = fs.readFileSync(gatewayBridgePath, 'utf8')

  // 注入 openclaw-source 绝对路径
  gatewayBridgeSource = gatewayBridgeSource.replaceAll(
    '__OPENCLAW_SOURCE_PLACEHOLDER__',
    JSON.stringify(openclawSourcePath)
  )

  // 将所有 './xxx' 相对导入替换为绝对路径（支持 await import 和直接 import）
  gatewayBridgeSource = gatewayBridgeSource.replace(
    /(await\s+)?import\s*\(\s*['"]\.\/([^'"]+)['"]\s*\)/g,
    (_match, _awaitKw, modulePath) => {
      const absolutePath = path.join(mainSrcRoot, modulePath)
      const awaitKw = _awaitKw ? 'await ' : ''
      return `${awaitKw}import(${JSON.stringify(absolutePath)})`
    }
  )

  // 写入临时文件供 esbuild 消费
  const tempBridgePath = path.join(ROOT, 'dist/_gateway-bridge-injected.ts')
  fs.writeFileSync(tempBridgePath, gatewayBridgeSource)

  // 主进程构建（使用注入后的临时文件）
  esbuild.buildSync({
    entryPoints: [tempBridgePath],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: path.join(DIST_MAIN, 'index.js'),
    external: ['electron'],
    format: 'esm',
    banner: { js: esmBanner },
  })

  // 清理临时文件
  fs.unlinkSync(tempBridgePath)
  console.log('Main process built')
}

function buildPreload() {
  console.log('Building preload script...')

  // Preload 构建 — 输出为 .cjs 强制走 CommonJS，绕过 package.json 的 "type": "module"
  esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src/preload/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: path.join(DIST_PRELOAD, 'index.cjs'),
    external: ['electron'],
    format: 'cjs',
  })
  console.log('Preload script built')
}

function checkOpenClawSource() {
  const openclawPath = path.resolve(ROOT, 'resources', 'openclaw-source')
  if (!fs.existsSync(openclawPath)) {
    console.log('OpenClaw source not found, skipping (run: node scripts/download-openclaw.mjs)')
  } else {
    console.log('OpenClaw source found')
  }
}

console.log('SynClaw Build Script')
checkNodeVersion()
ensureDistDirs()
buildMainProcess()
buildPreload()
checkOpenClawSource()
console.log('Build complete!')

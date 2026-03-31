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

  // openclaw-source 路径在运行时通过 app.isPackaged 判断，构建脚本无需处理。
  // src/main/ 的绝对路径
  const mainSrcRoot = path.resolve(ROOT, 'src/main')

  const esmBanner = `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`.trim()

  // ── 构建主进程（使用原始源文件，无需路径注入）──────────────
  // openclaw-source 路径在运行时通过 app.isPackaged 判断，不再需要构建时注入。
  esbuild.buildSync({
    entryPoints: [path.join(mainSrcRoot, 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: path.join(DIST_MAIN, 'index.js'),
    external: ['electron'],
    format: 'esm',
    banner: { js: esmBanner },
  })
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

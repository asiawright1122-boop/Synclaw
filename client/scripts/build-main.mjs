#!/usr/bin/env node
/**
 * SynClaw 主进程构建脚本
 * 用 TypeScript 编译器替代 esbuild，解决 electron 模块的 require 问题。
 * TypeScript 编译器能正确处理 CJS 输出中的 electron 静态 import。
 */

import * as ts from 'typescript'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_MAIN = path.join(ROOT, 'dist', 'main')
const DIST_PRELOAD = path.join(ROOT, 'dist', 'preload')
const SRC_MAIN = path.resolve(ROOT, 'src/main')
const SRC_PRELOAD = path.resolve(ROOT, 'src/preload')

function checkNodeVersion() {
  const version = process.version.slice(1)
  const [major] = version.split('.').map(Number)
  if (major < 20) {
    console.error(`Node.js 20+ required, got ${version}`)
    process.exit(1)
  }
  console.log(`Node.js ${version}`)
}

function ensureDistDirs() {
  fs.mkdirSync(DIST_MAIN, { recursive: true })
  fs.mkdirSync(DIST_PRELOAD, { recursive: true })
}

function cleanDist(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
  }
}

function buildWithTsc(srcDir, outDir, name) {
  console.log(`Building ${name}...`)
  cleanDist(outDir)

  const configPath = path.join(ROOT, 'tsconfig.main.json')
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  )

  const program = ts.createProgram({
    rootNames: [path.join(srcDir, 'index.ts')],
    options: {
      ...parsedConfig.options,
      outDir,
      rootDir: 'src',
      sourceMap: false,
      declaration: false,
    },
  })

  const emitResult = program.emit()
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  for (const diagnostic of allDiagnostics) {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start)
      const msg = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      console.error(`${diagnostic.file.fileName}:${line + 1}:${character + 1} - ${msg}`)
    } else {
      console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  }

  if (emitResult.emitSkipped) {
    process.exit(1)
  }
  console.log(`${name} built`)
}

function ensureCommonJsPackage(outDir) {
  const pkgPath = path.join(outDir, 'package.json')
  const pkg = { type: 'commonjs' }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
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
buildWithTsc(SRC_MAIN, DIST_MAIN, 'main process')
buildWithTsc(SRC_PRELOAD, DIST_PRELOAD, 'preload script')
ensureCommonJsPackage(DIST_MAIN)
ensureCommonJsPackage(DIST_PRELOAD)
checkOpenClawSource()
console.log('Build complete!')

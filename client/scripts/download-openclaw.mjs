/**
 * download-openclaw.mjs
 *
 * 从 npm registry 下载 OpenClaw 包并解压到 resources/openclaw-source/。
 *
 * 用法：
 *   node scripts/download-openclaw.mjs
 *   node scripts/download-openclaw.mjs --force    # 强制重新下载
 *
 * 配置（package.json）：
 *   "openclawVersion": "latest"    // 默认 "latest"，也支持 "beta" 或具体版本如 "2026.3.13"
 *   "scripts": {
 *     "openclaw:download": "node scripts/download-openclaw.mjs",
 *     "openclaw:update": "node scripts/sync-openclaw-version.mjs && node scripts/download-openclaw.mjs"
 *   }
 *
 * 环境变量：
 *   OPENCLAW_NPM_REGISTRY   # 覆盖 npm registry（默认 https://registry.npmjs.org）
 */

import { createWriteStream, existsSync, mkdirSync, rmSync } from 'fs'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'
import { createHash } from 'crypto'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '..')
const RESOURCES_DIR = join(ROOT_DIR, 'resources')
const TARGET_DIR = join(RESOURCES_DIR, 'openclaw-source')
const PACKAGE_JSON_PATH = join(ROOT_DIR, 'package.json')

// ── Config ──────────────────────────────────────────────────────────────────

const NPM_REGISTRY = process.env.OPENCLAW_NPM_REGISTRY || 'https://registry.npmjs.org'

// ── Version resolution ─────────────────────────────────────────────────────

async function getOpenClawVersion() {
  try {
    const pkg = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf-8'))
    return pkg.openclawVersion ?? 'latest'
  } catch {
    return 'latest'
  }
}

// ── npm registry: resolve tarball URL ──────────────────────────────────────

async function resolveTarballUrl(version) {
  // version = "latest" | "beta" | "1.2.3"
  const tag = version === 'latest' ? 'latest' : version
  const url = `${NPM_REGISTRY}/openclaw${tag === 'latest' ? '' : '-' + tag}`
  try {
    // Try to get the redirect URL from npm registry
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SynClaw-Downloader/1.0', 'Accept': 'application/json' },
      redirect: 'manual',
    })
    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get('location')
      if (location) return location
    }
    // Fallback: construct tarball URL directly
    const cleanVersion = tag === 'latest' ? '' : tag.replace(/^v/, '')
    return `${NPM_REGISTRY}/openclaw/-/openclaw-${cleanVersion}.tgz`
  } catch {
    const cleanVersion = tag === 'latest' ? '' : tag.replace(/^v/, '')
    return `${NPM_REGISTRY}/openclaw/-/openclaw-${cleanVersion}.tgz`
  }
}

// ── npm registry: get version from dist-tag ─────────────────────────────────

async function fetchVersionFromTag(tag) {
  const url = `${NPM_REGISTRY}/openclaw`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SynClaw-Downloader/1.0', 'Accept': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const pkg = await res.json()
    const version = pkg['dist-tags']?.[tag] ?? pkg['dist-tags']?.['latest']
    if (version) return version
    throw new Error(`No version found for tag "${tag}"`)
  } catch (err) {
    throw new Error(`Failed to fetch version for tag "${tag}": ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ── Download with progress ─────────────────────────────────────────────────

async function downloadFile(url, destPath) {
  const httpMod = await import('node:http')
  const httpsMod = await import('node:https')

  const httpClient = url.startsWith('https') ? httpsMod : httpMod

  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath)

    const req = httpClient.get(url, { headers: { 'User-Agent': 'SynClaw-Downloader/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
        return
      }

      if (res.statusCode !== 200) {
        file.close()
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
        return
      }

      const contentLength = parseInt(res.headers['content-length'] ?? '0', 10)
      let downloaded = 0

      res.on('data', (chunk) => {
        downloaded += chunk.length
        if (contentLength > 0) {
          const pct = ((downloaded / contentLength) * 100).toFixed(1)
          process.stdout.write(`\r  Downloading... ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`)
        }
      })

      pipeline(res, file)
        .then(() => {
          console.log(`\n  Downloaded: ${destPath}`)
          resolve()
        })
        .catch(reject)
    })

    req.on('error', (err) => {
      file.close()
      reject(err)
    })

    req.setTimeout(60_000, () => {
      req.destroy()
      file.close()
      reject(new Error('Download timeout (60s)'))
    })
  })
}

// ── Extract tar.gz ────────────────────────────────────────────────────────

function extractTarGz(tarPath, destDir) {
  return new Promise((resolve, reject) => {
    // npm tarball structure: package/...
    // --strip-components=1 removes the "package" prefix
    const args = ['xzf', tarPath, '-C', destDir, '--strip-components=1']
    const proc = spawn('tar', args)

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`tar exited with code ${code}. Make sure tar and xz are installed.`))
      }
    })
    proc.on('error', reject)
  })
}

// ── Entry ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const forceRedownload = args.includes('--force')

async function main() {
  console.log('\nSynClaw OpenClaw Downloader\n')
  console.log(`  Registry: ${NPM_REGISTRY}\n`)

  if (!existsSync(RESOURCES_DIR)) {
    mkdirSync(RESOURCES_DIR, { recursive: true })
    console.log('  Created resources/ directory')
  }

  // Resolve version
  let version = await getOpenClawVersion()
  if (version === 'latest' || version === 'beta') {
    const tag = version
    console.log(`  Detected "${tag}", querying npm registry...`)
    try {
      version = await fetchVersionFromTag(tag)
      console.log(`  Resolved ${tag} → ${version}`)
    } catch (err) {
      console.warn(`  Warning: Could not resolve "${tag}", falling back to latest: ${err.message}`)
      version = await fetchVersionFromTag('latest')
      console.log(`  Resolved latest → ${version}`)
    }
  }

  // Check existing
  const packageJsonInTarget = join(TARGET_DIR, 'package.json')
  if (existsSync(packageJsonInTarget) && !forceRedownload) {
    try {
      const existingPkg = JSON.parse(await readFile(packageJsonInTarget, 'utf-8'))
      const existingVersion = existingPkg.version ?? 'unknown'
      if (existingVersion === version) {
        console.log(`  OpenClaw v${existingVersion} already exists at ${TARGET_DIR}`)
        console.log('  Use --force to re-download\n')
        return
      } else {
        console.log(`  Detected older version v${existingVersion}, replacing with v${version}...`)
        rmSync(TARGET_DIR, { recursive: true, force: true })
      }
    } catch {
      rmSync(TARGET_DIR, { recursive: true, force: true })
    }
  } else if (forceRedownload) {
    console.log('  --force flag: re-downloading regardless of existing version...')
    rmSync(TARGET_DIR, { recursive: true, force: true })
  }

  mkdirSync(TARGET_DIR, { recursive: true })

  // Build tarball URL
  const cleanVersion = version.replace(/^v/, '')
  const tarballName = `openclaw-${cleanVersion}.tgz`
  const downloadUrl = `${NPM_REGISTRY}/openclaw/-/${tarballName}`

  console.log(`  Version: ${cleanVersion}`)
  console.log(`  URL: ${downloadUrl}\n`)
  console.log('  Downloading...')

  const tarPath = join(RESOURCES_DIR, 'openclaw-source.tgz')

  try {
    await downloadFile(downloadUrl, tarPath)
  } catch (err) {
    console.error(`\n\nFailed to download: ${err instanceof Error ? err.message : err}`)
    console.error(`   npm registry: ${NPM_REGISTRY}`)
    console.error(`   version: ${cleanVersion}`)
    process.exit(1)
  }

  console.log('\n  Extracting...')
  try {
    await extractTarGz(tarPath, TARGET_DIR)
    console.log('  Extracted successfully\n')
  } catch (err) {
    console.error(`\n\nExtraction failed: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }

  // Clean up
  try { rmSync(tarPath) } catch { /* ignore */ }

  // Verify
  let installedVersion = 'unknown'
  try {
    const pkg = JSON.parse(await readFile(packageJsonInTarget, 'utf-8'))
    installedVersion = pkg.version ?? 'unknown'
  } catch { /* ignore */ }

  console.log(`OpenClaw v${installedVersion} installed to ${TARGET_DIR}/\n`)
}

main().catch((err) => {
  console.error(`\nUnexpected error: ${err instanceof Error ? err.message : err}\n`)
  process.exit(1)
})

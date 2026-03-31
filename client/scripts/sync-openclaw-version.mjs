/**
 * sync-openclaw-version.mjs
 *
 * 在构建前自动查询 npm registry 获取最新版本并更新 package.json 中的 openclawVersion。
 * 支持 CI 环境和本地开发环境。
 *
 * 用法：
 *   node scripts/sync-openclaw-version.mjs           # 查询最新版本并更新
 *   node scripts/sync-openclaw-version.mjs --dry     # 仅查询，不写入文件
 *   node scripts/sync-openclaw-version.mjs --check   # 检查是否有新版本（返回 exit code）
 *   node scripts/sync-openclaw-version.mjs --force v1.2.0  # 强制设置指定版本
 *
 * CI 集成示例（在 package.json scripts 中）：
 *   "electron:build": "npm run openclaw:sync && npm run build && electron-builder",
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const PACKAGE_JSON_PATH = join(ROOT_DIR, 'package.json')

// ── Config ─────────────────────────────────────────────────────────────────
// 如需使用私有 npm registry，设置环境变量 OPENCLAW_NPM_REGISTRY
const NPM_REGISTRY = process.env.OPENCLAW_NPM_REGISTRY || 'https://registry.npmjs.org'

// ── npm registry API ─────────────────────────────────────────────────────

async function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    import('node:https').then(httpsMod => {
      httpsMod.get(
        `${NPM_REGISTRY}/openclaw`,
        {
          headers: {
            'User-Agent': 'SynClaw-Sync/1.0',
            'Accept': 'application/json',
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => {
            try {
              const pkg = JSON.parse(data)
              const latestVersion = pkg['dist-tags']?.['latest']
              if (!latestVersion) throw new Error('No latest tag found')
              resolve({ version: latestVersion, prerelease: false, tag: `v${latestVersion}`, url: '' })
            } catch {
              reject(new Error(`Failed to parse npm registry response`))
            }
          })
          res.on('error', reject)
        }
      ).on('error', reject)
    })
  })
}

// ── Package.json read/write ─────────────────────────────────────────────────

async function readPackageJson() {
  const content = await readFile(PACKAGE_JSON_PATH, 'utf-8')
  return JSON.parse(content)
}

async function writePackageJson(pkg) {
  await writeFile(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
}

// ── Version comparison ──────────────────────────────────────────────────────

function compareVersions(current, latest) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number)
  const a = parse(current)
  const b = parse(latest)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai < bi) return -1
    if (ai > bi) return 1
  }
  return 0
}

// ── Main logic ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry')
  const isCheck = args.includes('--check')
  const forceArg = args.find(a => a.startsWith('--force='))

  // Determine target version
  let targetVersion = null
  if (forceArg) {
    targetVersion = forceArg.replace('--force=', '').replace(/^v/, '')
    console.log(`  Force setting version to: ${targetVersion}`)
  }

  // Read current package.json
  let pkg
  try {
    pkg = await readPackageJson()
  } catch (err) {
    console.error(`Failed to read package.json: ${err.message}`)
    process.exit(1)
  }

  const currentVersion = pkg.openclawVersion ?? 'latest'

  // If already at a specific version (not "latest"), compare
  if (currentVersion !== 'latest' && !targetVersion) {
    try {
      const latest = await fetchLatestVersion()
      const cmp = compareVersions(currentVersion, latest.version)
      if (cmp < 0) {
        console.log(`\n  New OpenClaw version available:`)
        console.log(`    Current: ${currentVersion}`)
        console.log(`    Latest:  ${latest.version} (${latest.url})`)
        if (isCheck) {
          console.log(`\n  Update available (exit 1)`)
          process.exit(1)
        }
      } else if (isCheck) {
        console.log(`\n  Already on latest: ${currentVersion}`)
        process.exit(0)
      } else {
        console.log(`\n  OpenClaw ${currentVersion} is already the latest.`)
        return
      }
    } catch (err) {
      console.warn(`  Warning: Could not fetch latest version: ${err.message}`)
      console.warn(`  Keeping current version: ${currentVersion}`)
      if (isCheck) process.exit(0)
      return
    }
  }

  // Fetch latest if needed
  if (!targetVersion) {
    console.log(`\n  Querying npm registry for latest OpenClaw version...`)
    try {
      const latest = await fetchLatestVersion()
      targetVersion = latest.version

      if (currentVersion === targetVersion && !isCheck) {
        console.log(`  Already up-to-date: v${targetVersion}`)
        return
      }

      console.log(`  Latest version: ${targetVersion}`)
      if (latest.prerelease) {
        console.warn(`  Warning: Latest release is a pre-release (${latest.tag})`)
      }
    } catch (err) {
      console.error(`  Failed to fetch latest version: ${err.message}`)
      if (isCheck) {
        console.log(`  Cannot check — exit 1`)
        process.exit(1)
      }
      console.error(`  Keeping current version: ${currentVersion}`)
      return
    }
  }

  // Dry run — don't write
  if (isDryRun) {
    console.log(`\n  [DRY RUN] Would update openclawVersion: ${currentVersion} → ${targetVersion}`)
    return
  }

  // Check mode — don't write
  if (isCheck) {
    console.log(`  Update available: ${currentVersion} → ${targetVersion} (exit 0)`)
    process.exit(0)
  }

  // Write updated version
  pkg.openclawVersion = targetVersion
  try {
    await writePackageJson(pkg)
    console.log(`\n  Updated openclawVersion: ${currentVersion} → ${targetVersion}`)
    console.log(`  Run 'npm run openclaw:download' to fetch the new version.\n`)
  } catch (err) {
    console.error(`  Failed to write package.json: ${err.message}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`\nUnexpected error: ${err instanceof Error ? err.message : err}\n`)
  process.exit(1)
})

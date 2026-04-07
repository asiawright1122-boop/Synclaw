/**
 * check-openclaw-version.mjs
 *
 * 检查本地安装的 OpenClaw 版本是否满足最低安全版本要求。
 * 失败时输出警告（exit 1）以触发 CI 失败。
 *
 * 用法：
 *   node scripts/check-openclaw-version.mjs              # 检查版本
 *   node scripts/check-openclaw-version.mjs --strict   # 不满足时 exit 1
 *
 * CI 集成（在 .github/workflows/ci.yml lint job 末尾）：
 *   - name: OpenClaw version health check
 *     run: node scripts/check-openclaw-version.mjs --strict
 *     working-directory: client
 */

import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = join(__dirname, '..')
const OPENCLAW_SOURCE_DIR = join(CLIENT_DIR, 'openclaw-source')

// Minimum recommended version (must be >= to pass)
const MIN_VERSION = '2026.3.12'

// Known CVEs addressed by MIN_VERSION
const KNOWN_CVES = [
  { id: 'GHSA-rqpp-rjj8-7wv8', severity: 'CRITICAL', fixedIn: '2026.3.12', description: 'Scope elevation via operator token' },
]

function parseVersion(v) {
  return String(v).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
}

function isVersionAtLeast(installed, minimum) {
  const a = parseVersion(installed)
  const b = parseVersion(minimum)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false
  }
  return true
}

async function main() {
  const args = process.argv.slice(2)
  const isStrict = args.includes('--strict')

  // Try to read version from openclaw-source/package.json
  let installedVersion = null
  let sourceDir = null

  const candidates = [
    join(OPENCLAW_SOURCE_DIR, 'package.json'),
    join(CLIENT_DIR, 'node_modules', 'openclaw-source', 'package.json'),
  ]

  for (const pkgPath of candidates) {
    try {
      const content = await readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(content)
      installedVersion = pkg.version ?? null
      sourceDir = pkgPath
      break
    } catch {
      // Not found at this path, try next
    }
  }

  if (!installedVersion) {
    const msg = `[OpenClaw version check] openclaw-source not found. Run: node scripts/download-openclaw.mjs`
    if (isStrict) {
      console.error(`ERROR: ${msg}`)
      process.exit(1)
    } else {
      console.warn(`WARN: ${msg}`)
      process.exit(0)
    }
  }

  const pass = isVersionAtLeast(installedVersion, MIN_VERSION)

  if (pass) {
    console.log(`[OK] OpenClaw v${installedVersion} >= v${MIN_VERSION} — CVE check passed`)
    KNOWN_CVES.forEach(cve => {
      console.log(`     ${cve.id} (${cve.severity}) — fixed in v${cve.fixedIn}`)
    })
    process.exit(0)
  } else {
    const affectedCves = KNOWN_CVES.filter(cve => !isVersionAtLeast(installedVersion, cve.fixedIn))
    console.error(`[FAIL] OpenClaw v${installedVersion} < v${MIN_VERSION}`)
    if (affectedCves.length > 0) {
      console.error(`     Affected CVEs:`)
      affectedCves.forEach(cve => {
        console.error(`       - ${cve.id} (${cve.severity}): ${cve.description}`)
      })
    }
    console.error(`\n  Run: node scripts/download-openclaw.mjs`)
    if (isStrict) process.exit(1)
    process.exit(0)
  }
}

main().catch(err => {
  console.error(`Unexpected error: ${err.message}`)
  if (isStrict) process.exit(1)
})

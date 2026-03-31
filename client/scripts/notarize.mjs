/**
 * client/scripts/notarize.mjs
 *
 * 本地 macOS 公证脚本（用于 CI 之外的本地验证）。
 *
 * 用法：
 *   node scripts/notarize.mjs --app /path/to/SynClaw.app --zip /path/to/SynClaw.zip
 *
 * 环境变量（必需）：
 *   APPLE_ID                — Apple 开发者账号邮箱
 *   APPLE_APP_SPECIFIC_PASSWORD — 应用专用密码（appleid.apple.com 生成）
 *   APPLE_TEAM_ID           — 团队 ID
 *
 * 可选：
 *   NOTARYTOOL_PATH         — notarytool 路径（默认使用 xcrun 查找）
 *   STAPLER_PATH            — stapler 路径（同上）
 */

import { spawn } from 'child_process'
import { existsSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseArgs } from 'util'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Helpers ──────────────────────────────────────────────────────────────────

function exec(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      ...opts,
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += d.toString() })
    child.stderr?.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr, code })
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}\n${stderr}`))
    })
    child.on('error', reject)
  })
}

function findInPath(name) {
  const out = process.env.PATH?.split(':').map((d) => `${d}/${name}`).find((p) => existsSync(p))
  return out ?? name
}

async function waitForNotarize(uuid, retries = 20, intervalMs = 15000) {
  for (let i = 0; i < retries; i++) {
    console.log(`  ⏳ Checking notarization status (${i + 1}/${retries})…`)
    try {
      const { stdout } = await exec('xcrun', [
        'notarytool', 'info', uuid,
        '--apple-id', process.env.APPLE_ID,
        '--password', process.env.APPLE_APP_SPECIFIC_PASSWORD,
        '--team-id', process.env.APPLE_TEAM_ID,
      ])
      if (stdout.includes('status: Accepted')) {
        console.log('  ✅ Notarization accepted!')
        return true
      }
    } catch {
      // Still processing
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { values } = parseArgs({
    options: {
      app: { type: 'string' },
      zip: { type: 'string' },
      submit: { type: 'boolean', default: true },
      wait: { type: 'boolean', default: true },
      staple: { type: 'boolean', default: true },
    },
  })

  const appPath = values.app
  const zipPath = values.zip

  // Validate env
  const required = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ Missing required env: ${key}`)
      console.error('  Run: export APPLE_ID=... APPLE_APP_SPECIFIC_PASSWORD=... APPLE_TEAM_ID=...')
      process.exit(1)
    }
  }

  const target = appPath ?? zipPath
  if (!target || !existsSync(target)) {
    console.error(`❌ Target not found: ${target}`)
    process.exit(1)
  }

  console.log(`\n🔏 SynClaw Notarization Script`)
  console.log(`   Account: ${process.env.APPLE_ID}`)
  console.log(`   Team:    ${process.env.APPLE_TEAM_ID}`)
  console.log(`   Target:  ${target}\n`)

  // Step 1: Submit to Apple
  if (values.submit) {
    console.log('📤 Submitting to Apple Notarization…')
    try {
      const { stdout } = await exec('xcrun', [
        'notarytool', 'submit', target,
        '--apple-id', process.env.APPLE_ID,
        '--password', process.env.APPLE_APP_SPECIFIC_PASSWORD,
        '--team-id', process.env.APPLE_TEAM_ID,
        '--output-format', 'json',
      ], { cwd: __dirname })
      const parsed = JSON.parse(stdout)
      if (parsed.status === 'Accepted') {
        console.log('  ✅ Accepted immediately (ticket already cached)')
      } else {
        console.log(`  📋 Received UUID: ${parsed.uuid}`)
        const ok = values.wait ? await waitForNotarize(parsed.uuid) : true
        if (!ok) {
          console.error('  ❌ Notarization timed out or failed')
          process.exit(1)
        }
      }
    } catch (err) {
      console.error(`  ❌ Notarization failed: ${err.message}`)
      process.exit(1)
    }
  }

  // Step 2: Staple ticket
  if (values.staple && appPath && existsSync(appPath)) {
    console.log('\n📎 Stapling ticket to app…')
    try {
      await exec('xcrun', ['stapler', 'staple', appPath])
      console.log('  ✅ Ticket stapled successfully')

      // Step 3: Validate
      console.log('\n🔍 Validating…')
      await exec('xcrun', ['stapler', 'validate', appPath])
      console.log('  ✅ Validation passed')
    } catch (err) {
      console.error(`  ⚠️  Staple/validate failed: ${err.message}`)
      console.error('     The app will still run but Gatekeeper may show a warning.')
    }
  }

  console.log('\n✅ Notarization complete!\n')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

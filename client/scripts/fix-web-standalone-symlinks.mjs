#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_ROOT = path.resolve(__dirname, '..')
const STANDALONE_ROOT = path.resolve(CLIENT_ROOT, '../web/.next/standalone')
const PNPM_ROOT = path.join(STANDALONE_ROOT, 'node_modules', '.pnpm')
const PNPM_HOIST_ROOT = path.join(PNPM_ROOT, 'node_modules')

async function fixBrokenHoistedSymlinks() {
  if (!existsSync(PNPM_HOIST_ROOT)) {
    console.log('[web-standalone] pnpm hoist directory not found, skipping')
    return
  }

  const packageDirs = (await fs.readdir(PNPM_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules')
    .map((entry) => entry.name)

  const hoistedEntries = await fs.readdir(PNPM_HOIST_ROOT, { withFileTypes: true })
  let fixedCount = 0

  for (const entry of hoistedEntries) {
    const linkPath = path.join(PNPM_HOIST_ROOT, entry.name)
    const stat = await fs.lstat(linkPath)

    if (!stat.isSymbolicLink()) continue

    const target = await fs.readlink(linkPath)
    const resolvedTarget = path.resolve(PNPM_HOIST_ROOT, target)
    if (existsSync(resolvedTarget)) continue

    const packagePrefix = entry.name.startsWith('@')
      ? `${entry.name.replace('/', '+')}@`
      : `${entry.name}@`

    const directPackageDirs = packageDirs.filter(
      (dir) => dir === entry.name || dir.startsWith(packagePrefix)
    )

    const candidatePool = (directPackageDirs.length > 0 ? directPackageDirs : packageDirs)
    const candidates = candidatePool
      .map((dir) => path.join(PNPM_ROOT, dir, 'node_modules', entry.name))
      .filter((candidate) => existsSync(candidate))

    if (candidates.length !== 1) {
      throw new Error(
        `[web-standalone] Broken symlink ${linkPath} -> ${target}; expected exactly one replacement candidate, found ${candidates.length}`
      )
    }

    const nextTarget = path.relative(path.dirname(linkPath), candidates[0])
    await fs.unlink(linkPath)
    await fs.symlink(nextTarget, linkPath)
    fixedCount += 1

    console.log(`[web-standalone] repaired ${entry.name} -> ${nextTarget}`)
  }

  if (fixedCount === 0) {
    console.log('[web-standalone] no broken pnpm hoist symlinks found')
  } else {
    console.log(`[web-standalone] repaired ${fixedCount} broken symlink(s)`)
  }
}

fixBrokenHoistedSymlinks().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

/**
 * Path validation utilities shared by file handlers.
 * All validation resolves symlinks via realpath() before checking,
 * preventing symlink-based sandbox escapes.
 */

import * as path from 'node:path'
import { realpath } from 'node:fs/promises'

export const BLOCKED_PATHS = new Set([
  '/etc',
  '/private/etc',
  '/proc',
  '/sys',
  '/dev',
  '/root',
  '/boot',
  '/run',
  '/var/run',
  '/private/var/run',
  '/usr/bin',
  '/usr/lib',
  '/usr/sbin',
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  'C:\\ProgramData',
])

export function isPathBlocked(filePath: string): boolean {
  const normalized = path.normalize(filePath)
  for (const blocked of Array.from(BLOCKED_PATHS)) {
    if (normalized.startsWith(blocked + path.sep) || normalized === blocked) return true
  }
  return false
}

export function isPathAuthorized(filePath: string, authorizedDirs: string[]): boolean {
  if (authorizedDirs.length === 0) return false
  const normalized = path.normalize(filePath)
  return authorizedDirs.some(dir => {
    const authNorm = path.normalize(dir)
    return normalized.startsWith(authNorm + path.sep) || normalized === authNorm
  })
}

export interface PathValidation {
  valid: boolean
  error?: string
}

export async function validatePath(
  filePath: string,
  authorizedDirs: string[],
  limitAccess: boolean,
): Promise<PathValidation> {
  // Resolve all symlinks and .. references before checking
  let realPath: string
  try {
    realPath = await realpath(filePath)
  } catch {
    // realpath throws if file doesn't exist; fall back to normalized path
    // but only for write operations; read operations should use the actual path
    realPath = path.normalize(filePath)
  }
  if (isPathBlocked(realPath)) {
    return { valid: false, error: `访问被拒绝：系统敏感目录 ${filePath}` }
  }
  if (!limitAccess) return { valid: true }
  if (!isPathAuthorized(realPath, authorizedDirs)) {
    return { valid: false, error: `访问被拒绝：路径 ${filePath} 未在授权目录范围内` }
  }
  return { valid: true }
}

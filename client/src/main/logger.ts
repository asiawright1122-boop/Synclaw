/**
 * logger.ts — Shared logger for the main process.
 * Uses electron-log for structured, file-based logging with levels.
 *
 * electron-log advantages over console.*:
 *   - Persistent logs across app restarts
 *   - Automatic log rotation and file output
 *   - Structured metadata (timestamps, log levels, file names)
 *   - Renderer process logging (via IPC bridge)
 */

import log from 'electron-log'
import { app } from 'electron'

// Configure electron-log for SynClaw
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// Log file location: ~/Library/Logs/SynClaw/ (macOS) or equivalent on other platforms
log.transports.file.resolvePathFn = () => {
  const name = app.getName() || 'SynClaw'
  const path = process.platform === 'darwin'
    ? `${process.env.HOME}/Library/Logs/${name}/`
    : app.getPath('logs')
  return `${path}main.log`
}

// Truncate very long arguments to avoid huge log lines
const MAX_ARG_LEN = 10_000

function truncate(arg: unknown): string {
  const s = typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  return s.length > MAX_ARG_LEN ? s.slice(0, MAX_ARG_LEN) + '...[truncated]' : s
}

const fmt = (args: unknown[], prefix = '') =>
  args.length
    ? `${prefix}${args.map(truncate).join(' ')}`
    : prefix

const logger = {
  debug: (...args: unknown[]) => log.debug(...args.map(truncate)),
  info:  (...args: unknown[]) => log.info(...args.map(truncate)),
  warn:  (...args: unknown[]) => log.warn(...args.map(truncate)),
  error: (...args: unknown[]) => log.error(...args.map(truncate)),

  // Convenience: scoped logger (adds a prefix tag to every message)
  scope(tag: string) {
    return {
      debug: (...a: unknown[]) => log.debug(`[${tag}]`, ...a.map(truncate)),
      info:  (...a: unknown[]) => log.info(`[${tag}]`, ...a.map(truncate)),
      warn:  (...a: unknown[]) => log.warn(`[${tag}]`, ...a.map(truncate)),
      error: (...a: unknown[]) => log.error(`[${tag}]`, ...a.map(truncate)),
    }
  },
}

export default logger

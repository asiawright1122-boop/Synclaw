/**
 * pillBtn.ts — Shared pill-button style utility for Settings panels.
 * Pure string function, no React dependency.
 */
export function pillBtn(primary?: boolean): string {
  return `px-3.5 py-1.5 rounded-full text-sm font-medium transition-opacity shrink-0 ${
    primary ? 'text-white border-0' : 'border bg-white'
  }`
}

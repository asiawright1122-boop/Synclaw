/**
 * types.ts — Shared TypeScript types used by both main and preload.
 * Kept in src/shared so both process contexts can import it.
 */

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// electron-shim.ts — injected by esbuild into the main process bundle.
// Replaces the npm stub with the real Electron API at bundle time.
import * as electron from 'electron'
export { electron }

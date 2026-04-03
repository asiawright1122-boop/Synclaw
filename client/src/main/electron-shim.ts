/**
 * electron-shim.ts
 *
 * A stable bridge for requiring Electron's native modules in the bundled CJS output.
 * Problem: The 'electron' npm package's index.js returns the binary path string
 * when require() is called synchronously before Electron's require hook runs.
 * This happens because Electron intercepts require('electron') at the runtime level,
 * but esbuild's bundled code may resolve it differently.
 *
 * Solution: This shim is bundled OUTSIDE esbuild's main bundle and manually loaded
 * via createRequire. It uses createRequire to ensure the electron module is resolved
 * relative to the electron binary's location, not the bundle's location.
 */

import { createRequire } from 'module'
import { dirname, join } from 'path'

// Get the electron binary path from the electron package
const electronPath = require('electron')

// Use createRequire with __dirname set to electron's own directory
// This ensures require('electron') resolves through Electron's own require hook
const electronRequire = createRequire(join(dirname(electronPath as string), 'dummy'))

// Actually load electron through electron's own require system
const electron = electronRequire('electron')

export const { app } = electron as typeof import('electron')
export { electron as default }

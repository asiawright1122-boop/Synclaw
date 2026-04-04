#!/usr/bin/env node
// This runs as Electron main process entry point (no -e flag)
const e = require('electron')
console.log('=== require("electron") in Electron main process ===')
console.log('type:', typeof e)
console.log('app:', typeof e?.app)
console.log('process.type:', process.type)
console.log('versions.electron:', process.versions.electron)
process.exit(typeof e?.app === 'undefined' ? 1 : 0)

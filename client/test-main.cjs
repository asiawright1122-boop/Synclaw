#!/usr/bin/env node
// Test main: runs as electron's main entry point via `electron .`
const e = require('electron')
console.log('=== require("electron") in main process ===')
console.log('Type:', typeof e)
console.log('Is string?', typeof e === 'string')
console.log('app type:', typeof e?.app)
console.log('Keys (first 5):', Object.keys(e || {}).slice(0, 5))
process.exit(typeof e?.app === 'undefined' ? 1 : 0)

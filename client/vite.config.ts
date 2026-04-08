import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      // Prevent Vite from bundling main/preload process code into renderer output.
      // Without this, esbuild transitively resolves src/main/** imports and emits a
      // spurious dist/main/index.cjs (26500-line ESM→CJS bundle) alongside the real
      // dist/main/index.mjs produced by scripts/build-main.mjs.  Electron would then
      // load index.cjs instead of index.mjs and crash with:
      //   ERR_REQUIRE_ESM: require() of ES Module gateway-runtime.js not supported.
      external: [
        'electron',
        ...Object.keys(process.env).filter(k => k.startsWith('ELECTRON_')),
      ],
      // Scoped to main/preload source only
      noExternal: [],
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer')
    }
  },
  server: {
    port: 5174,
    strictPort: true,
    // 开发模式：将 /api 请求代理到 web 服务（避免 CORS）
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

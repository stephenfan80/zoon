import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  envDir: __dirname,  // 从项目根目录（vite.config.ts 所在位置）加载 .env
  publicDir: resolve(__dirname, 'public'),
  base: './',  // Use relative paths for self-hosted embedding
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // IIFE keeps the bundle easy to embed in external hosts.
    modulePreload: false,
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'src/index.html'),
      },
      output: {
        // Keep filenames predictable for external embedding
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Use IIFE format for broad runtime compatibility
        format: 'iife',
        // Ensure window.proof is accessible globally
        name: 'ProofEditor',
        inlineDynamicImports: true
      }
    },
  },
  server: {
    port: 3001,
    strictPort: true,  // Fail if port in use instead of auto-incrementing
    open: false,
    host: 'localhost',
    proxy: {
      '/assets': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/d': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/new': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/get-started': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/agent-docs': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/open': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/skill': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/snapshots': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  publicDir: 'public',
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
  server: { port: 5191, strictPort: true },
});

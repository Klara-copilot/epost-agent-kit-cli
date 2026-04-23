import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    proxy: { '/api': 'http://localhost:3456' },
  },
  build: {
    outDir: resolve(__dirname, '../ui-dist'),
    emptyOutDir: true,
  },
});

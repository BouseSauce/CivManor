import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.', // Root is the workspace root
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@components': path.resolve(__dirname, './src/frontend/components'),
    },
  },
});

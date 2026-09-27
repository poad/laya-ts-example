import devtools from 'solid-devtools/vite';
import { defineConfig } from 'vite';
import Pages from 'vite-plugin-pages';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    devtools(),
    Pages({
      dirs: ['src/pages'],
    }),
    solidPlugin(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
  },
});

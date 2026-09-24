import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(process.env.ANALYZE_BUNDLE === 'true' ? [
        visualizer({
          filename: 'stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
      ] : []),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      include: ['src/__tests__/**/*.test.{ts,tsx}', 'server/__tests__/**/*.test.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-markdown',
        'lucide-react',
        'date-fns',
        'motion/react'
      ]
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
      watch: null,
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
                return 'vendor-react';
              }
              if (/\/node_modules\/react-router/.test(id)) {
                return 'vendor-router';
              }
              if (/\/node_modules\/(motion|framer-motion)\//.test(id)) {
                return 'vendor-motion';
              }
              if (/\/node_modules\/(react-markdown|micromark|unified|mdast|unist|vfile)\//.test(id)) {
                return 'vendor-markdown';
              }
              if (/\/node_modules\/docx\//.test(id)) {
                return 'vendor-docx';
              }
              if (/\/node_modules\/mermaid\//.test(id)) {
                return 'vendor-mermaid';
              }
              if (/\/node_modules\/lucide-react\//.test(id)) {
                return 'vendor-icons';
              }
              if (/\/node_modules\/(date-fns|canvas-confetti)\//.test(id)) {
                return 'vendor-utils';
              }
            }
          },
        },
      },
    },
  };
});

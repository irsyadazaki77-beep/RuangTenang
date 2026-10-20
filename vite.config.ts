import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => {
  return {
    // Only explicitly public settings are eligible for client-side exposure.
    envPrefix: 'VITE_PUBLIC_',
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
      // Frontend (jsdom) and backend (node) run as separate projects so server tests
      // do not pay for a DOM. A backend file needing a DOM must opt in explicitly with
      // a `// @vitest-environment jsdom` directive.
      projects: [
        {
          extends: true,
          test: {
            name: 'frontend',
            environment: 'jsdom',
            setupFiles: ['./src/__tests__/setup.ts'],
            include: ['src/__tests__/**/*.test.{ts,tsx}'],
          },
        },
        {
          extends: true,
          test: {
            name: 'backend',
            environment: 'node',
            setupFiles: ['./server/__tests__/setup.ts'],
            include: ['server/__tests__/**/*.test.ts'],
          },
        },
      ],
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
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
      // Keep HMR disabled, but let Vite watch source files so a page refresh
      // picks up edits served by this embedded Express development server.
      hmr: false,
    },
    esbuild: {
      legalComments: 'none',
    },
    build: {
      target: 'es2022',
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
              // Leave Mermaid under Rollup's async graph. Forcing it into a manual
              // vendor chunk also pulled Vite's preload helper into that chunk, so
              // unrelated lazy routes downloaded Mermaid during Workspace startup.
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

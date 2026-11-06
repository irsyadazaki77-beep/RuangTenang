import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Only explicitly public settings are eligible for client-side exposure.
    envPrefix: 'VITE_PUBLIC_',
    plugins: [
      react(),
      tailwindcss(),
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
            include: ['src/**/*.test.{ts,tsx}'],
          },
        },
        {
          extends: true,
          test: {
            name: 'backend',
            environment: 'node',
            include: ['server/**/*.test.ts'],
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
      entries: ['index.html'],
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-markdown',
        'date-fns',
        'motion/react'
      ]
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
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

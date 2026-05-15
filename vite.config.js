import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const base = process.env.VITE_BASE_PATH
    ?? (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/');

  return {
    plugins: [react()],
    base,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            const normalized = id.replace(/\\/g, '/');
            if (normalized.includes('/@firebase/firestore') || normalized.includes('/firebase/firestore') || normalized.includes('/@firebase/webchannel-wrapper')) return 'firestore';
            if (normalized.includes('/@firebase/auth') || normalized.includes('/firebase/auth')) return 'firebase-auth';
            if (normalized.includes('/@firebase/') || normalized.includes('/firebase/') || normalized.includes('/idb/')) return 'firebase-core';
            if (normalized.includes('/react')) return 'react';
            if (normalized.includes('/lucide-react/')) return 'icons';
            return 'vendor';
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});

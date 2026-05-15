import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const base = process.env.VITE_BASE_PATH
    ?? (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/');

  return {
    plugins: [react()],
    base,
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});

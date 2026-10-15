import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative asset paths, so the build also works from a sub-folder
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});

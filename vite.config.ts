import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // fileURLToPath는 공백이 포함된 경로(C:\dev\Excel Practice)도 올바르게 디코딩한다.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

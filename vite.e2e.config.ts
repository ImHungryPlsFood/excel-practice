import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/*
 * E2E 전용 빌드 설정. vite.config.ts와 같되 CSS 최적화를 끈다: Lightning CSS가 `200ms`를 `.2s`로 바꿔 써서
 * 디자인 토큰 값을 문자열로 확인하는 E2E 단언이 개발 서버와 다른 결과를 받는다.
 */
export default defineConfig({
  plugins: [react(), tailwindcss({ optimize: false })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: { cssMinify: false },
});

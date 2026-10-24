import { availableParallelism } from 'node:os';

import { defineConfig, devices } from '@playwright/test';

/*
 * E2E는 개발 서버(vite dev)가 아니라 빌드 결과물(vite preview)에 붙는다.
 * 개발 서버는 워커마다 요청 시점에 모듈을 변환·컴파일해, 병렬 실행 시 첫 로드가 5초를 넘겼다.
 * 개발 확인 화면(/dev/*)이 필요한 테스트를 위해 perf 모드로 빌드한다(routes.tsx의 DEV_ROUTES_ENABLED).
 * 동시 실행 수는 브라우저 + 프리뷰 서버가 CPU를 서로 굶기지 않도록 코어의 1/4로 둔다(로컬/CI 동일 식).
 */
const PORT = 4391;
const WORKERS = Math.max(1, Math.floor(availableParallelism() / 4));

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: WORKERS,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite build --config vite.e2e.config.ts --mode perf --outDir dist-e2e && npx vite preview --config vite.e2e.config.ts --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

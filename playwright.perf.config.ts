import { defineConfig, devices } from '@playwright/test';

/*
 * P-06 가상 스크롤 성능 측정 전용 설정 (UX_MOTION_PERF P-06, CARD-02A).
 * 개발 서버(React 개발 모드)는 프로덕션보다 훨씬 느려 측정값이 왜곡되므로,
 * 프로덕션 최적화 빌드에 개발 확인 화면만 켠 perf 모드 빌드(dist-perf)를 띄워 측정한다.
 */
const PORT = 4173;

export default defineConfig({
  testDir: './tests/perf',
  testMatch: '**/*.perf.ts',
  // 다른 테스트와 CPU를 나눠 쓰면 프레임 측정이 흔들리므로 한 번에 하나만 실행한다.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite build --mode perf --outDir dist-perf && npx vite preview --outDir dist-perf --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

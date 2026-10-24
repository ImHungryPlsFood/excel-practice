import { availableParallelism } from 'node:os';

import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // 코어 수의 1/4로 제한한다. 기본값(코어 수 전체)이나 절반은 jsdom 환경 초기화가 CPU를 두고 경쟁해 테스트가 시간 초과로 실패했다(18코어에서 4개가 안정적).
      maxWorkers: Math.max(1, Math.floor(availableParallelism() / 4)),
      include: ['tests/unit/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
    },
  }),
);

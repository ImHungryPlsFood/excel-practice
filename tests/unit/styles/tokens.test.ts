/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Vitest는 CSS를 처리하지 않아 `?raw` import가 빈 문자열이 되므로 파일을 직접 읽는다.
// jsdom 환경에서는 import.meta.url이 file: URL이 아니어서 프로젝트 루트(vitest 실행 위치) 기준으로 찾는다.
const tokensCss = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

// MASTER_PROMPT §12.1 공통 토큰 12개 범주 → tokens.css 변수 접두사
const REQUIRED_TOKEN_PREFIXES: Record<string, string> = {
  색상: '--cc-color-',
  배경: '--cc-bg-',
  '텍스트 색상': '--cc-text-',
  경계선: '--cc-border-',
  그림자: '--cc-shadow-',
  여백: '--cc-space-',
  '모서리 둥글기': '--cc-radius-',
  '폰트 크기': '--cc-font-size-',
  '행 높이': '--cc-line-height-',
  '애니메이션 시간': '--motion-duration-',
  '전환 곡선': '--motion-ease-',
  '상태별 강조 색상': '--cc-state-',
};

const componentSources = import.meta.glob<string>(
  ['/src/components/**/*.tsx', '/src/pages/**/*.tsx'],
  { query: '?raw', import: 'default', eager: true },
);

describe('design tokens (R-12.11 ~ R-12.23)', () => {
  it.each(Object.entries(REQUIRED_TOKEN_PREFIXES))('defines %s tokens', (_, prefix) => {
    expect(tokensCss).toMatch(new RegExp(`${prefix}[\\w-]*\\s*:`));
  });

  it('defines grid row height and dense control height tokens', () => {
    expect(tokensCss).toMatch(/--cc-grid-row-height:\s*1\.5rem/);
    expect(tokensCss).toMatch(/--cc-control-height-sm:\s*2rem/);
  });

  it('collapses motion durations when reduced motion is requested', () => {
    const reducedBlock = tokensCss.split('@media (prefers-reduced-motion: reduce)')[1] ?? '';
    for (const name of ['instant', 'fast', 'normal', 'slow']) {
      expect(reducedBlock).toMatch(new RegExp(`--motion-duration-${name}:\\s*0\\.001ms`));
    }
  });

  it('scans at least the landing components', () => {
    expect(Object.keys(componentSources).length).toBeGreaterThanOrEqual(8);
  });

  it.each(Object.entries(componentSources))(
    '%s uses no hard-coded colors outside the token file',
    (_, source) => {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/\brgba?\(|\bhsla?\(/);
      expect(source).not.toMatch(/-\[(#|rgb|hsl)/);
    },
  );
});

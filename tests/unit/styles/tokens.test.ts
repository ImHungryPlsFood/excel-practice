/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

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

// import.meta.glob은 변환 결과가 vitest 캐시(node_modules/.vitest-cache)에 남아, 나중에 추가된 파일을 빼먹은 채
// 통과했다(CARD-03C의 tutorial/ 파일들). 실행할 때마다 실제 파일 시스템에서 대상 파일을 새로 찾는다.
// src 아래 모든 .tsx를 검사한다(features/ 포함). 검사에서 빼야 하는 파일은 이유와 함께 여기에만 적는다.
// 값은 src 기준 경로('/src/...')와 제외 이유다. 현재 제외 대상은 없다.
const EXCLUDED_FILES: Readonly<Record<string, string>> = {};
const srcRoot = resolve(process.cwd(), 'src');

function collectTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsx(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

const toKey = (relativePath: string) => `/src/${relativePath.split(sep).join('/')}`;

const componentSources: Record<string, string> = Object.fromEntries(
  collectTsx(srcRoot)
    .map((file) => [toKey(relative(srcRoot, file)), file] as const)
    .filter(([key]) => !(key in EXCLUDED_FILES))
    .map(([key, file]) => [key, readFileSync(file, 'utf8')]),
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

  it('scans every .tsx file under src except the explicitly excluded ones', () => {
    // 위 수집과 다른 방법(recursive readdir)으로 센 실제 파일 목록과 같아야 한다. 파일이 빠지면 여기서 실패한다.
    const actual = readdirSync(srcRoot, { recursive: true, encoding: 'utf8' })
      .filter((path) => path.endsWith('.tsx'))
      .map(toKey)
      .filter((key) => !(key in EXCLUDED_FILES));
    expect(Object.keys(componentSources).sort()).toEqual(actual.sort());
  });

  it('scans features/ and the app entry files', () => {
    const keys = Object.keys(componentSources);
    expect(keys.some((key) => key.startsWith('/src/features/'))).toBe(true);
    expect(keys).toContain('/src/main.tsx');
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

/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * CARD-03D 전환 애니메이션 규칙 (P-03, R-07.31): motion.css는 transform·opacity만 움직이고,
 * 시간은 --motion-* 토큰만 쓴다. 모션 감소 때 시간 토큰이 0이 되는지도 tokens.css에서 확인한다.
 */
const css = readFileSync(resolve(process.cwd(), 'src/styles/motion.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);
const tokens = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

const ALLOWED_PROPERTIES = new Set(['opacity', 'transform']);
const KEYFRAMES = /@keyframes\s+[\w-]+\s*\{[\s\S]*?\}\s*\}/g;

describe('motion.css', () => {
  it('keyframes 안에서는 transform과 opacity만 바꾼다', () => {
    const frames = css.match(KEYFRAMES) ?? [];
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      const body = frame.slice(frame.indexOf('{') + 1);
      const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1] ?? '');
      expect(properties.length).toBeGreaterThan(0);
      for (const property of properties) expect(ALLOWED_PROPERTIES.has(property)).toBe(true);
    }
  });

  it('시간과 곡선은 --motion-* 토큰만 쓰고 ms·s 값을 직접 쓰지 않는다', () => {
    const outsideFrames = css.replace(KEYFRAMES, '');
    expect(outsideFrames).toMatch(/var\(--motion-duration-/);
    expect(outsideFrames).not.toMatch(/\d\s*m?s\b/);
    expect(outsideFrames).not.toMatch(/cubic-bezier|steps\(/);
  });

  it('바운스·무한 반복 애니메이션이 없다', () => {
    expect(css).not.toMatch(/infinite|bounce|spring|shake/i);
  });

  it('모션 감소(OS 설정·앱 설정)에서는 시간 토큰이 0.001ms가 된다', () => {
    const markers = ['@media (prefers-reduced-motion: reduce)', ":root[data-motion='reduce']"];
    for (const marker of markers) {
      const start = tokens.indexOf(marker);
      expect(start).toBeGreaterThan(-1);
      const block = tokens.slice(start, tokens.indexOf('\n}', start));
      for (const name of ['instant', 'fast', 'normal', 'slow']) {
        expect(block).toContain(`--motion-duration-${name}: 0.001ms`);
      }
    }
  });
});

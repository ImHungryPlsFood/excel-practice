import { describe, expect, it } from 'vitest';

import { decimalPlaces, resultsMatch } from '@/engine/spreadsheet/numberFormat';

describe('decimalPlaces', () => {
  it('유효 숫자 15자리로 정리한 값의 소수 자릿수를 센다', () => {
    expect(decimalPlaces(10)).toBe(0);
    expect(decimalPlaces(12.35)).toBe(2);
    expect(decimalPlaces(0.1 + 0.2)).toBe(1);
    expect(decimalPlaces(-3.5)).toBe(1);
  });

  it('지수 표기가 되는 수는 판단하지 않는다', () => {
    expect(decimalPlaces(1e-7)).toBe(Number.POSITIVE_INFINITY);
    expect(decimalPlaces(1e21)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('resultsMatch — 15자리 유효숫자 비교', () => {
  it('부동소수 오차는 같은 값으로 본다', () => {
    expect(resultsMatch(0.1 + 0.2, 0.3)).toBe(true);
    expect(resultsMatch(1.1 * 3, 3.3)).toBe(true);
    expect(resultsMatch(12.35 + 10.25, 22.6)).toBe(true);
  });

  it('16자리째 이후만 다르면 같고, 15자리 안에서 다르면 다르다', () => {
    expect(resultsMatch(1234567890.12345, 1234567890.123451)).toBe(true);
    expect(resultsMatch(1234567890.12345, 1234567890.12346)).toBe(false);
    expect(resultsMatch(10.01, 10.02)).toBe(false);
  });

  it('숫자가 아닌 값은 형식까지 정확히 같아야 한다', () => {
    expect(resultsMatch('10', 10)).toBe(false);
    expect(resultsMatch('a', 'a')).toBe(true);
    expect(resultsMatch(true, 1)).toBe(false);
    expect(resultsMatch(null, 0)).toBe(false);
  });
});

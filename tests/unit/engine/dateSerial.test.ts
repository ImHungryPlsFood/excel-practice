import { describe, expect, it } from 'vitest';

import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import { dateToSerial, formatSerialAsIsoDate, serialToDate } from '@/engine/spreadsheet/dateSerial';

describe('Excel 1900 날짜 일련번호 (Q-07)', () => {
  it('1900-01-01은 1이다', () => {
    expect(dateToSerial({ year: 1900, month: 1, day: 1 })).toBe(1);
    expect(serialToDate(1)).toEqual({ year: 1900, month: 1, day: 1 });
  });

  it('1900년을 윤년으로 보아 1900-02-29에 60을 부여한다', () => {
    expect(dateToSerial({ year: 1900, month: 2, day: 28 })).toBe(59);
    expect(dateToSerial({ year: 1900, month: 2, day: 29 })).toBe(60);
    expect(dateToSerial({ year: 1900, month: 3, day: 1 })).toBe(61);
    expect(serialToDate(60)).toEqual({ year: 1900, month: 2, day: 29 });
    expect(serialToDate(61)).toEqual({ year: 1900, month: 3, day: 1 });
  });

  it('없는 날짜와 1900 이전은 null', () => {
    expect(dateToSerial({ year: 2023, month: 2, day: 29 })).toBeNull();
    expect(dateToSerial({ year: 1899, month: 12, day: 31 })).toBeNull();
    expect(serialToDate(0)).toBeNull();
    expect(serialToDate(Number.NaN)).toBeNull();
  });

  it('소수 부분(시각)은 날짜 계산에서 버린다', () => {
    expect(serialToDate(61.75)).toEqual({ year: 1900, month: 3, day: 1 });
  });

  it('1900-03-01 이후 모든 날짜에서 왕복 변환이 일치한다', () => {
    for (let serial = 1; serial <= 80_000; serial += 37) {
      const date = serialToDate(serial);
      expect(date).not.toBeNull();
      expect(dateToSerial(date as NonNullable<typeof date>)).toBe(serial);
    }
  });

  it('ISO 표시 형식', () => {
    expect(formatSerialAsIsoDate(60)).toBe('1900-02-29');
    expect(formatSerialAsIsoDate(0)).toBeNull();
  });
});

describe('엔진 날짜 함수와 일련번호 규칙 대조', () => {
  const engine = new HyperFormulaAdapter();
  const evaluate = async (formula: string) => {
    await engine.initWorkbook({ S: [[formula]] });
    return engine.getCellValue('S', 0, 0).value;
  };

  it.each([
    [1900, 1, 1],
    [1900, 2, 28],
    [1900, 3, 1],
    [1999, 12, 31],
    [2000, 2, 29],
    [2024, 3, 15],
    [2100, 1, 1],
  ])('DATE(%i,%i,%i)가 dateToSerial과 같다', async (year, month, day) => {
    expect(await evaluate(`=DATE(${year},${month},${day})`)).toBe(
      dateToSerial({ year, month, day }),
    );
  });

  it('일련번호 60의 YEAR/MONTH/DAY는 1900-02-29', async () => {
    expect(await evaluate('=YEAR(60)')).toBe(1900);
    expect(await evaluate('=MONTH(60)')).toBe(2);
    expect(await evaluate('=DAY(60)')).toBe(29);
  });

  it('한국식 날짜 문자열(YYYY-MM-DD)을 날짜로 해석한다', async () => {
    expect(await evaluate('=DATEVALUE("2024-03-15")')).toBe(
      dateToSerial({ year: 2024, month: 3, day: 15 }),
    );
  });
});

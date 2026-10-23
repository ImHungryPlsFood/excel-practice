/// <reference types="node" />
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readXlsx } from '../helpers/xlsx/readXlsx';

// scripts/golden/make-golden-formulas.mjs가 만든 기준 통합 문서(Excel 계산 전)를 검사한다.
const workbook = readXlsx(resolve(process.cwd(), 'tests/fixtures/golden-formulas.xlsx'));

describe('golden-formulas.xlsx (Excel 계산 전 기준 파일)', () => {
  it('열 때 전체 재계산하도록 설정되어 있다', () => {
    expect(workbook.fullCalcOnLoad).toBe(true);
  });

  it('검증용 시트를 모두 담고 있다', () => {
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(
      expect.arrayContaining([
        'Arithmetic',
        'CoreFunctions',
        'References',
        'DateSerial',
        'ErrorValues',
      ]),
    );
  });

  it('수식 셀에는 결과 값이 없다', () => {
    const withCached = workbook.sheets.flatMap((sheet) =>
      sheet.cells
        .filter((cell) => cell.formula !== undefined && cell.cached.kind !== 'empty')
        .map((cell) => `${sheet.name}!${cell.ref}`),
    );
    expect(withCached).toEqual([]);
  });

  it('수식마다 옆 열(D)에 검증 내용 설명이 있다', () => {
    const missing = workbook.sheets.flatMap((sheet) =>
      sheet.cells
        .filter((cell) => cell.formula !== undefined)
        .filter((cell) => {
          const note = sheet.cells.find((c) => c.row === cell.row && c.col === cell.col + 1);
          return note?.cached.kind !== 'string' || note.cached.value === '';
        })
        .map((cell) => `${sheet.name}!${cell.ref}`),
    );
    expect(missing).toEqual([]);
  });

  it('입력값을 읽는다(숫자·문자·논리값)', () => {
    const arithmetic = workbook.sheets.find((sheet) => sheet.name === 'Arithmetic');
    const cell = (ref: string) => arithmetic?.cells.find((c) => c.ref === ref)?.cached;
    expect(cell('A2')).toEqual({ kind: 'number', value: 3 });
    expect(cell('A13')).toEqual({ kind: 'string', value: '합계' });
    expect(cell('A16')).toEqual({ kind: 'boolean', value: true });
    expect(arithmetic?.cells.find((c) => c.ref === 'C2')?.formula).toBe('=A2+B2');
  });

  it('Excel 파일 형식의 _xlfn. 접두사를 떼어 낸다', () => {
    const formulas = workbook.sheets.flatMap((sheet) => sheet.cells.map((cell) => cell.formula));
    expect(formulas).toContain('=CONCAT(F2,"-",H2)');
  });
});

/// <reference types="node" />
/*
 * Q-01 Excel 대조 골든 테스트 (CARD-02B).
 * 기준: tests/fixtures/golden-excel-calculations.xlsx — scripts/golden/make-golden-formulas.mjs가 만든 파일을
 * 사용자가 웹 Excel에서 계산해 저장한 것. 기대값은 모두 이 파일에서 읽고, 테스트 코드에는 계산 결과를 적지 않는다.
 * 입력값과 수식을 엔진에 넣고 수식 셀마다 Excel 값과 비교한다(숫자 허용 오차 1e-9, TEST_STRATEGY Q-01).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CellResult, CellScalar } from '@/engine/spreadsheet/FormulaEngineAdapter';
import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import { INTERSECTION_UNSUPPORTED_MESSAGE } from '@/engine/spreadsheet/errorMessages';

import { readXlsx, type XlsxCell, type XlsxCellValue } from '../helpers/xlsx/readXlsx';

const EPSILON = 1e-9;
const excel = readXlsx(resolve(process.cwd(), 'tests/fixtures/golden-excel-calculations.xlsx'));
const source = readXlsx(resolve(process.cwd(), 'tests/fixtures/golden-formulas.xlsx'));

/** 입력 셀 값을 엔진 입력으로. 문자열은 숫자처럼 보여도 문자로 남도록 작은따옴표를 붙인다(Excel 텍스트 셀과 동일). */
function toEngineInput(cell: XlsxCell): CellScalar {
  if (cell.formula !== undefined) {
    return cell.formula;
  }
  switch (cell.cached.kind) {
    case 'number':
    case 'boolean':
      return cell.cached.value;
    case 'string':
      return `'${cell.cached.value}`;
    case 'error':
      throw new Error(`입력 셀에 오류 값이 있습니다: ${cell.ref} ${cell.cached.value}`);
    case 'empty':
      return null;
  }
}

function toWorkbook(): Record<string, CellScalar[][]> {
  const sheets: Record<string, CellScalar[][]> = {};
  for (const sheet of excel.sheets) {
    const rows: CellScalar[][] = [];
    for (const cell of sheet.cells) {
      const row = (rows[cell.row] ??= []);
      row[cell.col] = toEngineInput(cell);
    }
    // 빈 칸(희소 배열 구멍)은 null로 채운다.
    sheets[sheet.name] = Array.from(rows, (row) => Array.from(row ?? [], (value) => value ?? null));
  }
  return sheets;
}

/** 비교용 표현. 오류는 코드 문자열, 그 밖에는 값 자체. */
function engineOutcome(result: CellResult): XlsxCellValue {
  if (result.error) {
    return { kind: 'error', value: result.error.code };
  }
  switch (typeof result.value) {
    case 'number':
      return { kind: 'number', value: result.value };
    case 'string':
      return { kind: 'string', value: result.value };
    case 'boolean':
      return { kind: 'boolean', value: result.value };
    default:
      return { kind: 'empty' };
  }
}

const formulaCells = excel.sheets.flatMap((sheet) =>
  sheet.cells
    .filter((cell) => cell.formula !== undefined)
    .map((cell) => ({ sheet: sheet.name, cell })),
);

describe('Excel 기준 파일 상태', () => {
  it('모든 수식 셀에 Excel이 계산한 값이 있다', () => {
    const empty = formulaCells
      .filter(({ cell }) => cell.cached.kind === 'empty')
      .map(({ sheet, cell }) => `${sheet}!${cell.ref}`);
    expect(formulaCells.length).toBeGreaterThan(0);
    expect(empty).toEqual([]);
  });

  it('입력값은 계산 전 기준 파일과 같다(Excel에서 셀이 바뀌지 않았다)', () => {
    const inputs = (workbook: typeof excel) =>
      workbook.sheets.flatMap((sheet) =>
        sheet.cells
          .filter((cell) => cell.formula === undefined)
          .map((cell) => ({ at: `${sheet.name}!${cell.ref}`, value: cell.cached })),
      );
    expect(inputs(excel)).toEqual(inputs(source));
  });

  it('수식 개수가 계산 전 기준 파일과 같다', () => {
    const count = (workbook: typeof excel) =>
      workbook.sheets.flatMap((sheet) => sheet.cells.filter((cell) => cell.formula)).length;
    expect(count(excel)).toBe(count(source));
  });
});

/**
 * 엔진 한계로 확인되어 docs/EXCEL_DIFFERENCES.md에 근거와 함께 기록한 차이.
 * 셀 주소와 수식이 모두 같은 셀 하나만 예외이고, 그 셀도 "Excel 값이 기록과 같은지"와 "엔진 값이 기록과 같은지"를
 * 둘 다 검사한다. 어느 쪽이든 바뀌면 실패하므로 차이를 다시 조사하게 된다.
 */
const DOCUMENTED_DIFFERENCES = [
  {
    id: 'D-3',
    at: 'ErrorValues!C13',
    formula: '=SUM(A13:A14 B13:B14)',
    excel: { kind: 'error', value: '#NULL!' },
    engine: { kind: 'error', value: '#ERROR!' },
    message: INTERSECTION_UNSUPPORTED_MESSAGE,
  },
] as const;

const differencesDoc = readFileSync(resolve(process.cwd(), 'docs/EXCEL_DIFFERENCES.md'), 'utf8');

function findDifference(at: string, formula: string | undefined) {
  return DOCUMENTED_DIFFERENCES.find((d) => d.at === at && d.formula === formula);
}

describe('엔진 결과 = Excel 계산값 (Q-01)', () => {
  const engine = new HyperFormulaAdapter();

  beforeAll(async () => {
    await engine.initWorkbook(toWorkbook());
  });

  afterAll(() => {
    engine.destroy();
  });

  it.each(
    formulaCells
      .filter(({ sheet, cell }) => !findDifference(`${sheet}!${cell.ref}`, cell.formula))
      .map(({ sheet, cell }) => [`${sheet}!${cell.ref} ${cell.formula}`, sheet, cell] as const),
  )('%s', (_label, sheet, cell) => {
    const actual = engineOutcome(engine.getCellValue(sheet, cell.row, cell.col));
    const expected = cell.cached;
    if (expected.kind === 'number' && actual.kind === 'number') {
      expect(
        Math.abs(actual.value - expected.value),
        `엔진 ${actual.value}, Excel ${expected.value}`,
      ).toBeLessThanOrEqual(EPSILON);
    } else {
      expect(actual).toEqual(expected);
    }
  });

  describe('기록된 차이 (EXCEL_DIFFERENCES.md)', () => {
    it('예외는 기록된 셀 하나뿐이고, 그 셀이 기준 파일에 정확히 한 번 있다', () => {
      expect(DOCUMENTED_DIFFERENCES).toHaveLength(1);
      for (const difference of DOCUMENTED_DIFFERENCES) {
        const matches = formulaCells.filter(
          ({ sheet, cell }) => findDifference(`${sheet}!${cell.ref}`, cell.formula) === difference,
        );
        expect(matches, difference.at).toHaveLength(1);
      }
    });

    it.each(DOCUMENTED_DIFFERENCES.map((d) => [d.id, d] as const))(
      '%s 문서에 셀·수식·양쪽 값이 기록되어 있다',
      (_id, difference) => {
        const row = differencesDoc
          .split(/\r?\n/)
          .find((line) => line.includes(`| ${difference.id} |`));
        expect(row, `${difference.id} 행`).toBeDefined();
        for (const text of [
          difference.at,
          difference.formula,
          difference.excel.value,
          difference.engine.value,
        ]) {
          expect(row).toContain(text);
        }
      },
    );

    it.each(DOCUMENTED_DIFFERENCES.map((d) => [d.id, d] as const))(
      '%s Excel 값과 엔진 값이 기록과 같다',
      (_id, difference) => {
        const target = formulaCells.find(
          ({ sheet, cell }) => findDifference(`${sheet}!${cell.ref}`, cell.formula) === difference,
        );
        expect(target).toBeDefined();
        if (!target) {
          return;
        }
        expect(target.cell.cached).toEqual(difference.excel);
        const result = engine.getCellValue(target.sheet, target.cell.row, target.cell.col);
        expect(engineOutcome(result)).toEqual(difference.engine);
        expect(result.error?.message).toBe(difference.message);
      },
    );
  });
});

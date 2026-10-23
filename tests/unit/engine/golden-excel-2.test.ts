/// <reference types="node" />
/*
 * Q-01 Excel 대조 골든 테스트 2차 (CARD-02B 추가 작업).
 * 기준: tests/fixtures/golden-excel-calculations-2.xlsx — scripts/golden/make-golden-formulas-2.mjs가 만든
 * golden-formulas-2.xlsx를 사용자가 웹 Excel에서 계산해 저장한 것.
 * 비교 규칙은 make-golden-formulas-2.mjs 머리 주석과 docs/EXCEL_DIFFERENCES.md "2차 기준 파일의 비교 방법"이 정한 것이다.
 *   - 엔진에는 Excel 저장본이 아니라 원본(golden-formulas-2.xlsx)의 수식을 넣는다. Excel이 저장할 때 수식을 바꾸기 때문이다.
 *   - Excel 값은 셀 주소로 짝지어 읽는다. 숫자 허용 오차 1e-9, 그 밖에는 정확히 일치.
 *   - 기대값은 모두 Excel 파일에서 읽고 테스트 코드에는 계산 결과를 적지 않는다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CellResult, CellScalar } from '@/engine/spreadsheet/FormulaEngineAdapter';
import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';

import { readXlsx, type XlsxCell, type XlsxCellValue } from '../helpers/xlsx/readXlsx';

const EPSILON = 1e-9;
const excel = readXlsx(resolve(process.cwd(), 'tests/fixtures/golden-excel-calculations-2.xlsx'));
const source = readXlsx(resolve(process.cwd(), 'tests/fixtures/golden-formulas-2.xlsx'));

const COMPARE_COLUMN = 4; // E열 "비교 방식"
/** 비교 방식 '차이기록' 시트에서 엔진이 Excel과 다를 때 돌려줘야 하는 오류 코드 (EXCEL_DIFFERENCES D-7, D-8). */
const DOCUMENTED_ENGINE_CODE: Record<string, string> = {
  D7_IndexZero: '#VALUE!',
  D8_Unsupported: '#NAME?',
};

/**
 * 엔진과 Excel이 다르다고 확인해 docs/EXCEL_DIFFERENCES.md에 근거와 함께 기록한 셀.
 * 셀 주소와 수식이 모두 같은 셀 하나만 예외이고, 그 셀도 "Excel 값이 기록과 같은지"와 "엔진 값이 기록과 같은지"를
 * 둘 다 검사한다. 어느 쪽이든 바뀌면 실패하므로 차이를 다시 조사하게 된다.
 * excelText·engineText는 문서의 해당 행에 그대로 적혀 있어야 하는 표기다.
 * 분류: 엔진 한계 / 이번에 고치지 않음 / 미확인(웹 Excel 관찰값)
 */
interface DocumentedDifference {
  id: string;
  at: string;
  formula: string;
  excel: XlsxCellValue;
  engine: XlsxCellValue;
  excelText: string;
  engineText: string;
}

const text = (value: string): XlsxCellValue => ({ kind: 'string', value });
const DOCUMENTED_DIFFERENCES: readonly DocumentedDifference[] = [
  // D-9: & 연산자는 숫자를 문자열로 바꿀 때 HyperFormula 내부 변환(JS 기본 변환)을 쓴다 — 엔진 한계
  {
    id: 'D-9a',
    at: 'D6_NumToText!C2',
    formula: '="x"&(0.1+0.2)',
    excel: text('x0.3'),
    engine: text('x0.30000000000000004'),
    excelText: 'x0.3',
    engineText: 'x0.30000000000000004',
  },
  {
    id: 'D-9b',
    at: 'D6_NumToText!C5',
    formula: '="x"&(1/3)',
    excel: text('x0.333333333333333'),
    engine: text('x0.3333333333333333'),
    excelText: 'x0.333333333333333',
    engineText: 'x0.3333333333333333',
  },
  {
    id: 'D-9c',
    at: 'D6_NumToText!C6',
    formula: '="x"&(2/3)',
    excel: text('x0.666666666666667'),
    engine: text('x0.6666666666666666'),
    excelText: 'x0.666666666666667',
    engineText: 'x0.6666666666666666',
  },
  {
    id: 'D-9d',
    at: 'D6_NumToText!C7',
    formula: '="x"&(1/7)',
    excel: text('x0.142857142857143'),
    engine: text('x0.14285714285714285'),
    excelText: 'x0.142857142857143',
    engineText: 'x0.14285714285714285',
  },
  {
    id: 'D-9e',
    at: 'D6_NumToText!C11',
    formula: '="x"&(10^20)',
    excel: text('x1E+20'),
    engine: text('x100000000000000000000'),
    excelText: 'x1E+20',
    engineText: 'x100000000000000000000',
  },
  {
    id: 'D-9f',
    at: 'D6_NumToText!C12',
    formula: '="x"&(1/10000000)',
    excel: text('x0.0000001'),
    engine: text('x1e-7'),
    excelText: 'x0.0000001',
    engineText: 'x1e-7',
  },
  // D-10: 15자리를 넘는 숫자 상수 — 이번에 고치지 않음 (Excel은 입력할 때 16번째 자리부터 0으로 바꿔 저장)
  {
    id: 'D-10a',
    at: 'D6_NumToText!C8',
    formula: '="x"&1234567890123456',
    excel: text('x1234567890123450'),
    engine: text('x1234567890123456'),
    excelText: 'x1234567890123450',
    engineText: 'x1234567890123456',
  },
  {
    id: 'D-10b',
    at: 'D6_NumToText!C9',
    formula: '="x"&123456789012345678',
    excel: text('x123456789012345000'),
    engine: text('x123456789012345680'),
    excelText: 'x123456789012345000',
    engineText: 'x123456789012345680',
  },
  // D-11: 비교 연산의 15자리 허용 오차 — 엔진 한계
  {
    id: 'D-11',
    at: 'D6_NumToText!C18',
    formula: '=(0.1+0.2)=0.3',
    excel: { kind: 'boolean', value: true },
    engine: { kind: 'boolean', value: false },
    excelText: 'TRUE',
    engineText: 'FALSE',
  },
  // D-12: FILTER 일치 없음 — Excel의 #CALC!에 해당하는 오류 코드가 엔진에 없음 (웹 Excel 관찰값은 #VALUE!)
  {
    id: 'D-12',
    at: 'DynamicArrays!E2',
    formula: '=FILTER(Data!F2:F7,Data!H2:H7="없음")',
    excel: { kind: 'error', value: '#VALUE!' },
    engine: { kind: 'error', value: '#N/A' },
    excelText: '#VALUE!',
    engineText: '#N/A',
  },
  // D-13: UNIQUE 결과의 빈 셀 — 이번에 고치지 않음
  {
    id: 'D-13',
    at: 'DynamicArrays!N2',
    formula: '=UNIQUE(Data!D2:D6)',
    excel: { kind: 'number', value: 0 },
    engine: { kind: 'empty' },
    excelText: '0',
    engineText: '빈 값',
  },
  // D-14: 미확인 — 웹 Excel 관찰값이 Excel 문서와 다르거나 규칙을 알 수 없어 고치지 않음
  {
    id: 'D-14a',
    at: 'Text!C16',
    formula: '=TRIM(CHAR(160)&"a")',
    excel: text('a'),
    engine: text(' a'),
    excelText: '"a"',
    engineText: 'U+00A0 + "a"',
  },
  {
    id: 'D-14b',
    at: 'DateTime!C44',
    formula: '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"YD")',
    excel: { kind: 'number', value: 304 },
    engine: { kind: 'number', value: 305 },
    excelText: '304',
    engineText: '305',
  },
  {
    id: 'D-14c',
    at: 'Aggregate!C42',
    formula: '=AND(1,"a")',
    excel: { kind: 'boolean', value: true },
    engine: { kind: 'error', value: '#VALUE!' },
    excelText: 'TRUE',
    engineText: '#VALUE!',
  },
  {
    id: 'D-14d',
    at: 'Aggregate!C44',
    formula: '=OR(Data!H2:H3)',
    excel: { kind: 'error', value: '#VALUE!' },
    engine: { kind: 'boolean', value: false },
    excelText: '#VALUE!',
    engineText: 'FALSE',
  },
];

const differencesDoc = readFileSync(resolve(process.cwd(), 'docs/EXCEL_DIFFERENCES.md'), 'utf8');

function findDifference(at: string, formula: string | undefined) {
  return DOCUMENTED_DIFFERENCES.find((d) => d.at === at && d.formula === formula);
}

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

/** 원본 파일(수식 포함)을 엔진 입력으로. 배열 수식의 펼침 칸은 원본에 없으므로 엔진이 채운다. */
function toWorkbook(): Record<string, CellScalar[][]> {
  const sheets: Record<string, CellScalar[][]> = {};
  for (const sheet of source.sheets) {
    const rows: CellScalar[][] = [];
    for (const cell of sheet.cells) {
      (rows[cell.row] ??= [])[cell.col] = toEngineInput(cell);
    }
    sheets[sheet.name] = Array.from(rows, (row) => Array.from(row ?? [], (value) => value ?? null));
  }
  return sheets;
}

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

/** 행·열 번호(0부터) → 'AE10' 같은 주소 */
function addressOf(row: number, col: number): string {
  let label = '';
  for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  }
  return `${label}${row + 1}`;
}

/** 'A2:B4' → 행·열 번호(0부터) 목록 */
function expandRange(range: string): { row: number; col: number }[] {
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
  if (!match) {
    throw new Error(`범위 형식이 아닙니다: ${range}`);
  }
  const col = (letters: string) =>
    [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const cells: { row: number; col: number }[] = [];
  for (let row = Number(match[2]) - 1; row <= Number(match[4]) - 1; row += 1) {
    for (let c = col(match[1] ?? ''); c <= col(match[3] ?? ''); c += 1) {
      cells.push({ row, col: c });
    }
  }
  return cells;
}

/** Excel은 한 칸짜리 배열 범위를 'D2:D2' 대신 'D2'로 저장한다. */
function normalizeRange(range: string): string {
  const [from, to] = range.split(':');
  return from === to ? (from ?? range) : range;
}

function sameValue(actual: XlsxCellValue, expected: XlsxCellValue): void {
  if (expected.kind === 'number' && actual.kind === 'number') {
    expect(
      Math.abs(actual.value - expected.value),
      `엔진 ${actual.value}, Excel ${expected.value}`,
    ).toBeLessThanOrEqual(EPSILON);
  } else {
    expect(actual).toEqual(expected);
  }
}

function sourceCell(sheet: string, ref: string): XlsxCell | undefined {
  return source.sheets.find((s) => s.name === sheet)?.cells.find((c) => c.ref === ref);
}

/** 원본 파일 E열의 비교 방식. 시트 머리글이 없는 시트(Data, DynamicArrays)는 '값'. */
function compareMode(sheet: string, cell: XlsxCell): string {
  const mark = source.sheets
    .find((s) => s.name === sheet)
    ?.cells.find((c) => c.row === cell.row && c.col === COMPARE_COLUMN);
  return mark?.cached.kind === 'string' ? mark.cached.value : '값';
}

const excelFormulaCells = excel.sheets.flatMap((sheet) =>
  sheet.cells.filter((c) => c.formula !== undefined).map((cell) => ({ sheet: sheet.name, cell })),
);
const sourceFormulaCells = source.sheets.flatMap((sheet) =>
  sheet.cells.filter((c) => c.formula !== undefined).map((cell) => ({ sheet: sheet.name, cell })),
);
/** 배열 수식의 결과 범위 안에서 마스터 칸이 아닌 칸 (Excel은 이를 값으로 저장한다). */
const arrayInterior = new Set(
  sourceFormulaCells.flatMap(({ sheet, cell }) =>
    cell.arrayRef
      ? expandRange(cell.arrayRef)
          .filter((p) => !(p.row === cell.row && p.col === cell.col))
          .map((p) => `${sheet}:${p.row}:${p.col}`)
      : [],
  ),
);

describe('2차 Excel 기준 파일 상태', () => {
  it('원본의 모든 수식 셀이 Excel 파일에도 수식 셀이고, 계산된 값이 들어 있다', () => {
    const missing = sourceFormulaCells
      .filter(({ sheet, cell }) => {
        const found = excel.sheets
          .find((s) => s.name === sheet)
          ?.cells.find((c) => c.ref === cell.ref);
        return found?.formula === undefined || found.cached.kind === 'empty';
      })
      .map(({ sheet, cell }) => `${sheet}!${cell.ref}`);
    expect(sourceFormulaCells.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it('Excel 파일에 원본에 없는 수식 셀이 없다', () => {
    const known = new Set(sourceFormulaCells.map(({ sheet, cell }) => `${sheet}!${cell.ref}`));
    const extra = excelFormulaCells
      .map(({ sheet, cell }) => `${sheet}!${cell.ref}`)
      .filter((at) => !known.has(at));
    expect(extra).toEqual([]);
  });

  it('입력값은 원본과 같다(Excel에서 셀이 바뀌지 않았다). 배열 수식의 펼침 칸은 제외', () => {
    const inputs = (workbook: typeof excel) =>
      workbook.sheets.flatMap((sheet) =>
        sheet.cells
          .filter(
            (c) => c.formula === undefined && !arrayInterior.has(`${sheet.name}:${c.row}:${c.col}`),
          )
          .map((c) => ({ at: `${sheet.name}!${c.ref}`, value: c.cached })),
      );
    expect(inputs(excel)).toEqual(inputs(source));
  });

  it('Excel이 펼친 배열 수식 범위가 원본이 지정한 범위와 같다', () => {
    const arrays = (workbook: typeof excel) =>
      workbook.sheets.flatMap((sheet) =>
        sheet.cells
          .filter((c) => c.arrayRef !== undefined)
          .map((c) => `${sheet.name}!${c.ref}:${normalizeRange(c.arrayRef ?? '')}`),
      );
    expect(arrays(excel)).toEqual(arrays(source));
  });
});

describe('엔진 결과 = Excel 계산값, 원본 수식 기준 (Q-01)', () => {
  const engine = new HyperFormulaAdapter();

  beforeAll(async () => {
    await engine.initWorkbook(toWorkbook());
  });

  afterAll(() => {
    engine.destroy();
  });

  const comparable = sourceFormulaCells.filter(
    ({ sheet, cell }) =>
      compareMode(sheet, cell) !== 'Excel만' &&
      !cell.arrayRef &&
      !findDifference(`${sheet}!${cell.ref}`, cell.formula),
  );

  it.each(
    comparable.map(({ sheet, cell }) => {
      const expected = excel.sheets
        .find((s) => s.name === sheet)
        ?.cells.find((c) => c.ref === cell.ref);
      return [`${sheet}!${cell.ref} ${cell.formula}`, sheet, cell, expected] as const;
    }),
  )('%s', (_label, sheet, cell, expected) => {
    expect(expected, '기준 파일의 같은 주소 셀').toBeDefined();
    if (!expected) {
      return;
    }
    const actual = engineOutcome(engine.getCellValue(sheet, cell.row, cell.col));
    if (compareMode(sheet, cell) === '차이기록') {
      // 알려진 차이 시트: 같으면 통과. 다르면 Excel은 오류가 아닌 값이어야 하고 엔진은 그 시트의 기록된 오류 코드여야 한다.
      const same =
        JSON.stringify(actual) === JSON.stringify(expected.cached) ||
        (actual.kind === 'number' &&
          expected.cached.kind === 'number' &&
          Math.abs(actual.value - expected.cached.value) <= EPSILON);
      if (!same) {
        expect(expected.cached.kind, 'Excel은 계산된 값이어야 차이로 기록할 수 있다').not.toBe(
          'error',
        );
        expect(actual).toEqual({ kind: 'error', value: DOCUMENTED_ENGINE_CODE[sheet] });
      }
      return;
    }
    sameValue(actual, expected.cached);
  });

  describe('Excel만 확인하는 항목 (D-5 순환 참조)', () => {
    const cycles = sourceFormulaCells.filter(
      ({ sheet, cell }) => compareMode(sheet, cell) === 'Excel만',
    );

    it('원본에 순환 참조 셀이 있다', () => {
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('Excel(웹)은 순환 참조 셀 값을 계산하지 않고 빈 문자열로 저장했다', () => {
      for (const { sheet, cell } of cycles) {
        const found = excel.sheets
          .find((s) => s.name === sheet)
          ?.cells.find((c) => c.ref === cell.ref);
        expect(found?.cached, `${sheet}!${cell.ref}`).toEqual({ kind: 'string', value: '' });
      }
    });

    it.each(
      cycles.map(
        ({ sheet, cell }) => [`${sheet}!${cell.ref} ${cell.formula}`, sheet, cell] as const,
      ),
    )('%s 엔진은 #CYCLE!로 표시한다', (_label, sheet, cell) => {
      expect(engineOutcome(engine.getCellValue(sheet, cell.row, cell.col))).toEqual({
        kind: 'error',
        value: '#CYCLE!',
      });
    });
  });

  describe('배열 수식이 펼친 범위', () => {
    const arrays = sourceFormulaCells.filter(({ cell }) => cell.arrayRef !== undefined);

    it('원본에 배열 수식이 있다', () => {
      expect(arrays.length).toBeGreaterThan(0);
    });

    it.each(
      arrays.flatMap(({ sheet, cell }) =>
        expandRange(cell.arrayRef ?? '')
          .filter((p) => !findDifference(`${sheet}!${addressOf(p.row, p.col)}`, cell.formula))
          .map(
            (p) =>
              [
                `${sheet}!${cell.ref}의 ${String.fromCharCode(65 + p.col)}${p.row + 1} ${cell.formula}`,
                sheet,
                p,
              ] as const,
          ),
      ),
    )('%s', (_label, sheet, position) => {
      const expected = excel.sheets
        .find((s) => s.name === sheet)
        ?.cells.find((c) => c.row === position.row && c.col === position.col);
      expect(expected, 'Excel이 이 칸에 값을 저장했다').toBeDefined();
      if (!expected) {
        return;
      }
      sameValue(
        engineOutcome(engine.getCellValue(sheet, position.row, position.col)),
        expected.cached,
      );
    });
  });

  describe('기록된 차이 (EXCEL_DIFFERENCES.md)', () => {
    const target = (d: DocumentedDifference) => {
      const [sheet = '', address = ''] = d.at.split('!');
      const master = sourceFormulaCells.find(
        ({ sheet: s, cell }) =>
          s === sheet &&
          cell.formula === d.formula &&
          (cell.ref === address ||
            (cell.arrayRef !== undefined &&
              expandRange(cell.arrayRef).some((p) => addressOf(p.row, p.col) === address))),
      );
      const position = master && expandRange(`${address}:${address}`)[0];
      const expected = excel.sheets
        .find((s) => s.name === sheet)
        ?.cells.find((c) => position && c.row === position.row && c.col === position.col);
      return { sheet, master, position, expected };
    };

    it('예외 목록의 셀이 원본에 정확히 한 번씩 있다', () => {
      for (const d of DOCUMENTED_DIFFERENCES) {
        const [sheet = '', address = ''] = d.at.split('!');
        const matches = sourceFormulaCells.filter(
          ({ sheet: s, cell }) => s === sheet && cell.ref === address && cell.formula === d.formula,
        );
        expect(matches, d.at).toHaveLength(1);
      }
    });

    it.each(DOCUMENTED_DIFFERENCES.map((d) => [d.id, d] as const))(
      '%s 문서에 셀·수식·양쪽 값이 기록되어 있다',
      (_id, d) => {
        const row = differencesDoc.split(/\r?\n/).find((line) => line.includes(`| ${d.id} |`));
        expect(row, `${d.id} 행`).toBeDefined();
        for (const expectedText of [d.at, d.formula, d.excelText, d.engineText]) {
          expect(row).toContain(expectedText);
        }
      },
    );

    it.each(DOCUMENTED_DIFFERENCES.map((d) => [d.id, d] as const))(
      '%s Excel 값과 엔진 값이 기록과 같다',
      (_id, d) => {
        const { sheet, master, position, expected } = target(d);
        expect(master, '원본 수식 셀').toBeDefined();
        expect(position).toBeDefined();
        if (!position) {
          return;
        }
        expect(expected?.cached ?? { kind: 'empty' }).toEqual(d.excel);
        expect(engineOutcome(engine.getCellValue(sheet, position.row, position.col))).toEqual(
          d.engine,
        );
      },
    );
  });

  it('원본 파일은 지수 표기 수식을 Excel이 바꾸기 전 그대로 가진다', () => {
    expect(sourceCell('D4_Exponent', 'C2')?.formula).toBe('=1E+3');
  });
});

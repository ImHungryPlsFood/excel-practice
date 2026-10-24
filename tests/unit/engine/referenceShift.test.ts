import fc from 'fast-check';
import { HyperFormula } from 'hyperformula';
import { describe, expect, it } from 'vitest';

import {
  adjustFormulaForMove,
  adjustFormulaForStructure,
  formatSheetPrefix,
  scanReferences,
  shiftFormulaForCopy,
  type StructuralChange,
} from '@/engine/spreadsheet/operations/referenceShift';

/*
 * CARD-02E 참조 이동 (R-08.06, R-08.07, R-08.17).
 * 토큰 단위 규칙 검사와, 같은 동작을 HyperFormula 3.5.0(CARD-02B 엔진)의 행·열 삽입·삭제·복사 결과와 맞대어 보는 속성 테스트.
 */

const insertRows = (sheet: string, index: number, count = 1): StructuralChange => ({
  sheet,
  axis: 'row',
  kind: 'insert',
  index,
  count,
});
const deleteRows = (sheet: string, index: number, count = 1): StructuralChange => ({
  sheet,
  axis: 'row',
  kind: 'delete',
  index,
  count,
});
const insertCols = (sheet: string, index: number, count = 1): StructuralChange => ({
  sheet,
  axis: 'col',
  kind: 'insert',
  index,
  count,
});
const deleteCols = (sheet: string, index: number, count = 1): StructuralChange => ({
  sheet,
  axis: 'col',
  kind: 'delete',
  index,
  count,
});

describe('참조 토큰 읽기', () => {
  it('셀·범위·열 범위·행 범위·시트 접두를 찾는다', () => {
    const tokens = scanReferences(
      "=SUM(A1:B2)+$C$3+Data!D4+'My Data'!E5:F6+SUM(A:B)+SUM(2:3)+자료!G7",
    );
    expect(tokens.map((t) => [t.kind, t.sheet])).toEqual([
      ['range', null],
      ['cell', null],
      ['cell', 'Data'],
      ['range', 'My Data'],
      ['columns', null],
      ['rows', null],
      ['cell', '자료'],
    ]);
  });

  it.each([
    ['문자열', '="A1"&"B2:C3"'],
    ['함수 이름', '=LOG10(100)+ATAN2(1,1)'],
    ['이름·논리값', '=TRUE+FALSE'],
    ['지수 숫자', '=1E3+2.5'],
    ['범위를 벗어난 열·0행', '=XFE1+A0'],
  ])('%s는 참조가 아니다', (_label, formula) => {
    expect(scanReferences(formula)).toEqual([]);
  });

  it("작은따옴표 시트 이름의 '' 는 따옴표 글자다", () => {
    expect(scanReferences("='It''s'!A1")[0]?.sheet).toBe("It's");
  });

  it('수식이 아니면 빈 목록', () => {
    expect(scanReferences('A1')).toEqual([]);
  });
});

describe('복사·붙여넣기 참조 이동 (상대·절대·혼합)', () => {
  it.each([
    ['=A1', 1, 1, '=B2'],
    ['=$A$1', 5, 5, '=$A$1'],
    ['=A$1', 3, 2, '=C$1'],
    ['=$A1', 3, 2, '=$A4'],
    ['=SUM(A1:B2)*$C$1', 2, 0, '=SUM(A3:B4)*$C$1'],
    ['=Data!A1+Sheet1!B$2', 1, 1, '=Data!B2+Sheet1!C$2'],
    ["='My Data'!A1", 1, 0, "='My Data'!A2"],
    ['=SUM(A:B)', 3, 1, '=SUM(B:C)'],
    ['=SUM(1:2)', 2, 3, '=SUM(3:4)'],
    ['=SUM($A:B)', 0, 1, '=SUM($A:C)'],
    ['=SUM(B1:A1)', 1, 1, '=SUM(C2:B2)'],
    ['=SUM(A1:A$1)', 1, 0, '=SUM(A2:A$1)'],
  ])('%s 를 (%i행, %i열) 옮기면 %s', (formula, dRow, dCol, expected) => {
    expect(shiftFormulaForCopy(formula, dRow, dCol)).toBe(expected);
  });

  it('바뀌지 않는 글자(공백·문자열·소문자 함수 이름)는 그대로 둔다', () => {
    expect(shiftFormulaForCopy('=sum( a1 , "A1" )', 1, 0)).toBe('=sum( A2 , "A1" )');
  });

  it('시트 밖으로 나가면 그 참조가 #REF!가 된다', () => {
    expect(shiftFormulaForCopy('=A1+B5', -1, 0)).toBe('=#REF!+B4');
    expect(shiftFormulaForCopy('=SUM(A1:A3)', -1, 0)).toBe('=SUM(#REF!)');
    expect(shiftFormulaForCopy('=Data!A1', 0, -1)).toBe('=#REF!');
    expect(shiftFormulaForCopy('=A1000', 1, 0)).toBe('=#REF!');
    expect(shiftFormulaForCopy('=$A$1', -1, -1)).toBe('=$A$1');
  });
});

describe('행·열 삽입·삭제 참조 갱신', () => {
  it('삽입: 아래 참조는 절대 참조도 밀리고, 범위 안 삽입은 범위를 늘린다', () => {
    expect(adjustFormulaForStructure('=A1+A5+$A$5', 'Sheet1', insertRows('Sheet1', 2, 2))).toBe(
      '=A1+A7+$A$7',
    );
    expect(adjustFormulaForStructure('=SUM(B2:B5)', 'Sheet1', insertRows('Sheet1', 3))).toBe(
      '=SUM(B2:B6)',
    );
    expect(adjustFormulaForStructure('=SUM(B2:B5)', 'Sheet1', insertRows('Sheet1', 1))).toBe(
      '=SUM(B3:B6)',
    );
    expect(adjustFormulaForStructure('=SUM(B2:B5)', 'Sheet1', insertRows('Sheet1', 5))).toBe(
      '=SUM(B2:B5)',
    );
    expect(adjustFormulaForStructure('=C1+$C$1', 'Sheet1', insertCols('Sheet1', 0))).toBe(
      '=D1+$D$1',
    );
  });

  it('삭제: 지운 셀만 가리키면 #REF!, 범위 일부면 줄어든다', () => {
    expect(adjustFormulaForStructure('=A2+A3+A9', 'Sheet1', deleteRows('Sheet1', 1, 2))).toBe(
      '=#REF!+#REF!+A7',
    );
    expect(adjustFormulaForStructure('=SUM(A2:A6)', 'Sheet1', deleteRows('Sheet1', 2, 2))).toBe(
      '=SUM(A2:A4)',
    );
    expect(adjustFormulaForStructure('=SUM(A2:A6)', 'Sheet1', deleteRows('Sheet1', 0, 3))).toBe(
      '=SUM(A1:A3)',
    );
    expect(adjustFormulaForStructure('=SUM(A2:A3)', 'Sheet1', deleteRows('Sheet1', 1, 2))).toBe(
      '=SUM(#REF!)',
    );
    expect(adjustFormulaForStructure('=SUM(B1:D1)', 'Sheet1', deleteCols('Sheet1', 2))).toBe(
      '=SUM(B1:C1)',
    );
  });

  it('다른 시트의 행 삽입은 그 시트를 가리키는 참조만 바꾼다', () => {
    const change = insertRows('Data', 0);
    expect(adjustFormulaForStructure('=A1+Data!A1+data!B2', 'Sheet1', change)).toBe(
      '=A1+Data!A2+data!B3',
    );
    // 수식이 Data 시트에 있으면 접두 없는 참조가 Data를 가리킨다
    expect(adjustFormulaForStructure('=A1+Sheet1!A1', 'Data', change)).toBe('=A2+Sheet1!A1');
  });

  it('행 삽입은 열 범위에, 열 삽입은 행 범위에 영향이 없다', () => {
    expect(adjustFormulaForStructure('=SUM(A:A)', 'Sheet1', insertRows('Sheet1', 0))).toBe(
      '=SUM(A:A)',
    );
    expect(adjustFormulaForStructure('=SUM(A:A)', 'Sheet1', insertCols('Sheet1', 0))).toBe(
      '=SUM(B:B)',
    );
    expect(adjustFormulaForStructure('=SUM(1:1)', 'Sheet1', insertCols('Sheet1', 0))).toBe(
      '=SUM(1:1)',
    );
    expect(adjustFormulaForStructure('=SUM(2:4)', 'Sheet1', deleteRows('Sheet1', 2))).toBe(
      '=SUM(2:3)',
    );
  });

  it('시트 끝(1000행) 밖으로 밀리는 셀 참조는 #REF!, 범위는 끝까지로 줄인다', () => {
    expect(adjustFormulaForStructure('=A1000', 'Sheet1', insertRows('Sheet1', 0))).toBe('=#REF!');
    expect(adjustFormulaForStructure('=SUM(A1:A1000)', 'Sheet1', insertRows('Sheet1', 4))).toBe(
      '=SUM(A1:A1000)',
    );
  });
});

describe('잘라내기·붙여넣기 참조 갱신', () => {
  const move = {
    fromSheet: 'Sheet1',
    rect: { startRow: 0, startCol: 0, endRow: 1, endCol: 0 },
    toSheet: 'Sheet1',
    dRow: 0,
    dCol: 2,
  };

  it('옮긴 셀을 가리키던 참조는 새 위치로, 범위는 전체가 옮겨졌을 때만', () => {
    expect(adjustFormulaForMove('=A1+A2+$A$1+SUM(A1:A2)', 'Sheet1', 'Sheet1', move)).toBe(
      '=C1+C2+$C$1+SUM(C1:C2)',
    );
    expect(adjustFormulaForMove('=SUM(A1:A5)', 'Sheet1', 'Sheet1', move)).toBe('=SUM(A1:A5)');
  });

  it('덮어쓴 목적지 셀을 가리키던 참조는 #REF!', () => {
    expect(adjustFormulaForMove('=C1+C3', 'Sheet1', 'Sheet1', move)).toBe('=#REF!+C3');
  });

  it('다른 시트로 옮기면 시트 접두를 붙이고, 옮겨진 수식의 접두 없던 참조에는 원래 시트를 붙인다', () => {
    const toData = { ...move, toSheet: 'My Data', dCol: 0 };
    expect(
      adjustFormulaForMove('=A1*2', 'Sheet2', 'Sheet2', { ...toData, fromSheet: 'Sheet2' }),
    ).toBe("='My Data'!A1*2");
    // A2(옮겨지는 셀)의 수식 =A1+B1 이 My Data로 옮겨짐: A1은 같이 옮겨져 접두 없음, B1은 원래 시트
    expect(adjustFormulaForMove('=A1+B1', 'Sheet1', 'My Data', toData)).toBe('=A1+Sheet1!B1');
  });
});

describe('시트 접두 쓰기', () => {
  it.each([
    ['Sheet2', 'Sheet2!'],
    ['자료', '자료!'],
    ['My Data', "'My Data'!"],
    ["It's", "'It''s'!"],
    ['A1', "'A1'!"],
    ['2024', "'2024'!"],
  ])('%s → %s', (name, prefix) => {
    expect(formatSheetPrefix(name)).toBe(prefix);
  });
});

/*
 * 엔진 교차 검증 (카드 지침 "참조 계산은 CARD-02B 엔진 사용"): 무작위 참조 수식을 HyperFormula에 넣고
 * 같은 행·열 삽입·삭제·복사를 엔진 API로 한 결과와, 원문 토큰 변환 결과를 엔진에 다시 넣어 계산한 값을 비교한다.
 * 값이 같으면 두 방식이 같은 셀을 가리킨다는 뜻이다(엔진 수식 글자 모양은 다를 수 있어 값으로 비교한다).
 */
const SIZE = 12;

function engineWith(formula: string): HyperFormula {
  const data: (number | string | null)[][] = Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => (r + 1) * 100 + c + 1),
  );
  const hf = HyperFormula.buildFromSheets(
    { Sheet1: data, Data: data.map((row) => row.map((v) => (typeof v === 'number' ? v * 7 : v))) },
    { licenseKey: 'gpl-v3', maxRows: 40, maxColumns: 40 },
  );
  hf.setCellContents({ sheet: 0, row: SIZE + 4, col: SIZE + 4 }, [[formula]]);
  return hf;
}

const letters = (n: number) => String.fromCharCode(65 + n);
const cellArb = fc
  .record({
    col: fc.integer({ min: 0, max: SIZE - 1 }),
    row: fc.integer({ min: 0, max: SIZE - 1 }),
    colAbs: fc.boolean(),
    rowAbs: fc.boolean(),
  })
  .map(
    ({ col, row, colAbs, rowAbs }) =>
      `${colAbs ? '$' : ''}${letters(col)}${rowAbs ? '$' : ''}${row + 1}`,
  );
const termArb = fc.oneof(
  cellArb,
  fc.tuple(cellArb, cellArb).map(([a, b]) => `SUM(${a}:${b})`),
  cellArb.map((c) => `Data!${c}`),
);
const formulaArb = fc
  .array(termArb, { minLength: 1, maxLength: 4 })
  .map((terms) => `=${terms.join('+')}`);

/**
 * 끝점이 왼쪽 위 → 오른쪽 아래 순서이고 두 끝점의 $ 고정이 같은 범위만.
 * HyperFormula 3.5.0의 copy/paste는 B1:A1처럼 거꾸로 적힌 범위에서 "There is no AST with such key in the cache"
 * 예외를 던지고, A1:A$1을 아래로 붙여넣어 생기는 거꾸로 된 혼합 범위(A2:A$1)는 0으로 계산한다
 * (docs/EXCEL_DIFFERENCES.md D-18). 이 두 경우는 위 단위 테스트와 rowColumnOps·clipboard 테스트에서 따로 확인한다.
 */
const orderedCellPair = fc
  .tuple(
    fc.integer({ min: 0, max: SIZE - 1 }),
    fc.integer({ min: 0, max: SIZE - 1 }),
    fc.integer({ min: 0, max: SIZE - 1 }),
    fc.integer({ min: 0, max: SIZE - 1 }),
    fc.boolean(),
    fc.boolean(),
  )
  .map(([c1, c2, r1, r2, colAbs, rowAbs]) => {
    const [left, right] = c1 <= c2 ? [c1, c2] : [c2, c1];
    const [top, bottom] = r1 <= r2 ? [r1, r2] : [r2, r1];
    const c = colAbs ? '$' : '';
    const r = rowAbs ? '$' : '';
    return `SUM(${c}${letters(left)}${r}${top + 1}:${c}${letters(right)}${r}${bottom + 1})`;
  });
const copyFormulaArb = fc
  .array(
    fc.oneof(
      cellArb,
      orderedCellPair,
      cellArb.map((c) => `Data!${c}`),
    ),
    {
      minLength: 1,
      maxLength: 4,
    },
  )
  .map((terms) => `=${terms.join('+')}`);

const BOUNDS = { maxRows: 40, maxColumns: 40 };

function valueAt(hf: HyperFormula, row: number, col: number) {
  const value = hf.getCellValue({ sheet: 0, row, col });
  return typeof value === 'object' && value !== null ? `error:${String(value.type)}` : value;
}

describe('HyperFormula와 교차 검증 (fast-check)', () => {
  it('행·열 삽입·삭제 결과가 엔진의 addRows/removeRows/addColumns/removeColumns와 같은 값을 낸다', () => {
    fc.assert(
      fc.property(
        formulaArb,
        fc.constantFrom<'row' | 'col'>('row', 'col'),
        fc.constantFrom<'insert' | 'delete'>('insert', 'delete'),
        fc.integer({ min: 0, max: SIZE - 1 }),
        fc.integer({ min: 1, max: 3 }),
        fc.constantFrom('Sheet1', 'Data'),
        (formula, axis, kind, index, count, sheet) => {
          const viaEngine = engineWith(formula);
          const sheetId = sheet === 'Sheet1' ? 0 : 1;
          if (axis === 'row' && kind === 'insert') viaEngine.addRows(sheetId, [index, count]);
          if (axis === 'row' && kind === 'delete') viaEngine.removeRows(sheetId, [index, count]);
          if (axis === 'col' && kind === 'insert') viaEngine.addColumns(sheetId, [index, count]);
          if (axis === 'col' && kind === 'delete') viaEngine.removeColumns(sheetId, [index, count]);

          // 수식 셀 위치(SIZE+4)도 그 시트에서는 같이 움직인다
          const moves = sheet === 'Sheet1';
          const shift = kind === 'insert' ? count : -count;
          const at = SIZE + 4 + (moves && SIZE + 4 >= index ? shift : 0);
          const row = axis === 'row' ? at : SIZE + 4;
          const col = axis === 'col' ? at : SIZE + 4;

          const adjusted = adjustFormulaForStructure(
            formula,
            'Sheet1',
            { sheet, axis, kind, index, count },
            BOUNDS,
          );
          const viaTokens = engineWith('=0');
          if (axis === 'row' && kind === 'insert') viaTokens.addRows(sheetId, [index, count]);
          if (axis === 'row' && kind === 'delete') viaTokens.removeRows(sheetId, [index, count]);
          if (axis === 'col' && kind === 'insert') viaTokens.addColumns(sheetId, [index, count]);
          if (axis === 'col' && kind === 'delete') viaTokens.removeColumns(sheetId, [index, count]);
          viaTokens.setCellContents({ sheet: 0, row, col }, [[adjusted]]);

          expect(valueAt(viaTokens, row, col)).toEqual(valueAt(viaEngine, row, col));
          viaEngine.destroy();
          viaTokens.destroy();
        },
      ),
      { numRuns: 200 },
    );
  }, 60_000);

  it('복사·붙여넣기 결과가 엔진의 copy/paste와 같은 값을 낸다', () => {
    fc.assert(
      fc.property(
        copyFormulaArb,
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        (formula, row, col) => {
          const viaEngine = engineWith(formula);
          viaEngine.copy({
            start: { sheet: 0, row: SIZE + 4, col: SIZE + 4 },
            end: { sheet: 0, row: SIZE + 4, col: SIZE + 4 },
          });
          viaEngine.paste({ sheet: 0, row, col });
          const shifted = shiftFormulaForCopy(formula, row - (SIZE + 4), col - (SIZE + 4), BOUNDS);
          // 원본 셀도 같은 수식이어야 붙여넣은 수식의 범위가 원본 셀을 덮을 때 값이 같다
          const viaTokens = engineWith(formula);
          viaTokens.setCellContents({ sheet: 0, row, col }, [[shifted]]);
          expect(valueAt(viaTokens, row, col)).toEqual(valueAt(viaEngine, row, col));
          viaEngine.destroy();
          viaTokens.destroy();
        },
      ),
      { numRuns: 200 },
    );
  }, 60_000);
});

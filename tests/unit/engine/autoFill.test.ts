import fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkbookModel } from '@/components/spreadsheet/workbookModel';
import {
  continueSeries,
  copyFillWrites,
  fillWrites,
} from '@/engine/spreadsheet/operations/autoFill';
import { columnLetters, scanReferences } from '@/engine/spreadsheet/operations/referenceShift';

/*
 * CARD-02E 자동 채우기 (R-08.10, TEST_STRATEGY Q-04 "자동 채우기 수식 참조 변환").
 */

const rect = (startRow: number, startCol: number, endRow = startRow, endCol = startCol) => ({
  startRow,
  startCol,
  endRow,
  endCol,
});

function grid(cells: Record<string, string>) {
  return (row: number, col: number) => cells[`${columnLetters(col)}${row + 1}`] ?? '';
}

describe('continueSeries', () => {
  it.each([
    ['숫자 한 칸은 복사', ['5'], ['5', '5', '5']],
    ['등차', ['1', '3'], ['5', '7', '9']],
    ['감소', ['10', '8', '6'], ['4', '2', '0']],
    ['소수 오차 없음', ['0.1', '0.2'], ['0.3', '0.4', '0.5']],
    ['날짜 한 칸은 하루씩', ['2024-02-28'], ['2024-02-29', '2024-03-01', '2024-03-02']],
    ['날짜 일 간격', ['2024/01/01', '2024/01/08'], ['2024/01/15', '2024/01/22', '2024/01/29']],
    ['날짜 개월 간격', ['2024-01-15', '2024-03-15'], ['2024-05-15', '2024-07-15', '2024-09-15']],
    [
      '날짜 개월 간격(말일 보정)',
      ['2024-01-31', '2024-03-31'],
      ['2024-05-31', '2024-07-31', '2024-09-30'],
    ],
    ['MM/DD/YYYY', ['12/31/2023'], ['01/01/2024', '01/02/2024', '01/03/2024']],
    ['끝 숫자 글자', ['항목1'], ['항목2', '항목3', '항목4']],
    ['자릿수 유지', ['Q08', 'Q09'], ['Q10', 'Q11', 'Q12']],
    ['한국어 요일', ['금'], ['토', '일', '월']],
    ['한국어 요일(긴)', ['월요일', '수요일'], ['금요일', '일요일', '화요일']],
    ['한국어 월', ['11월'], ['12월', '1월', '2월']],
    ['영어 월 대문자', ['JAN'], ['FEB', 'MAR', 'APR']],
  ])('%s', (_label, values, expected) => {
    expect(continueSeries(values, 3)).toEqual(expected);
  });

  it.each([[['=A1']], [['a', 'b']], [['1', 'a']]])(
    '수식·글자·섞인 값은 null(되풀이) %j',
    (values) => {
      expect(continueSeries(values, 2)).toBeNull();
    },
  );
});

describe('fillWrites', () => {
  it('아래로: 열마다 따로, 수식은 원본 셀에서 떨어진 만큼 옮긴다', () => {
    const writes = fillWrites(
      grid({ A1: '1', A2: '2', B1: '=A1*$C$1', B2: 'x' }),
      rect(0, 0, 1, 1),
      'down',
      3,
    );
    expect(writes).toEqual([
      { row: 2, col: 0, value: '3' },
      { row: 3, col: 0, value: '4' },
      { row: 4, col: 0, value: '5' },
      { row: 2, col: 1, value: '=A3*$C$1' },
      { row: 3, col: 1, value: 'x' },
      { row: 4, col: 1, value: '=A5*$C$1' },
    ]);
  });

  it('위로 끌면 거꾸로 이어 간다', () => {
    const writes = fillWrites(grid({ A5: '10', A6: '20' }), rect(4, 0, 5, 0), 'up', 2);
    expect(writes).toEqual([
      { row: 3, col: 0, value: '0' },
      { row: 2, col: 0, value: '-10' },
    ]);
  });

  it('왼쪽으로 끌면 수식 열 참조가 줄고, 시트 밖은 #REF!', () => {
    const writes = fillWrites(grid({ B1: '=A1' }), rect(0, 1), 'left', 3);
    expect(writes).toEqual([{ row: 0, col: 0, value: '=#REF!' }]);
  });

  it('시트 끝을 넘는 칸은 만들지 않는다', () => {
    expect(fillWrites(grid({ A999: '1' }), rect(998, 0), 'down', 5)).toHaveLength(1);
  });
});

describe('copyFillWrites (Ctrl+D, Ctrl+R)', () => {
  it('Ctrl+D: 첫 행을 아래로 복사하고 시리즈는 만들지 않는다', () => {
    expect(copyFillWrites(grid({ A1: '1', B1: '=A1' }), rect(0, 0, 2, 1), 'down')).toEqual([
      { row: 1, col: 0, value: '1' },
      { row: 1, col: 1, value: '=A2' },
      { row: 2, col: 0, value: '1' },
      { row: 2, col: 1, value: '=A3' },
    ]);
  });

  it('한 행만 고르면 바로 위 셀을 복사한다. 맨 위 행이면 아무것도 없다', () => {
    expect(copyFillWrites(grid({ C1: '=B1' }), rect(1, 2), 'down')).toEqual([
      { row: 1, col: 2, value: '=B2' },
    ]);
    expect(copyFillWrites(grid({}), rect(0, 0), 'down')).toEqual([]);
  });

  it('Ctrl+R: 왼쪽 열을 오른쪽으로', () => {
    expect(copyFillWrites(grid({ A1: '=$A2+A3' }), rect(0, 0, 0, 2), 'right')).toEqual([
      { row: 0, col: 1, value: '=$A2+B3' },
      { row: 0, col: 2, value: '=$A2+C3' },
    ]);
  });
});

/*
 * Q-04 자동 채우기 수식 참조 변환 불변식: 아래로 N행 끌면 상대 행은 정확히 +N, $ 고정 행·열과 상대 열은 그대로.
 * 오른쪽으로 끌면 상대 열이 +N. (TEST_STRATEGY Q-04)
 */
const refArb = fc.record({
  col: fc.integer({ min: 0, max: 20 }),
  row: fc.integer({ min: 0, max: 50 }),
  colAbs: fc.boolean(),
  rowAbs: fc.boolean(),
});
const formatRef = (r: { col: number; row: number; colAbs: boolean; rowAbs: boolean }) =>
  `${r.colAbs ? '$' : ''}${columnLetters(r.col)}${r.rowAbs ? '$' : ''}${r.row + 1}`;

describe('자동 채우기 주소 오프셋 (Q-04, fast-check)', () => {
  it('아래·오른쪽으로 N칸 채우면 상대 참조만 N 늘고 절대 참조는 그대로다', () => {
    fc.assert(
      fc.property(
        fc.array(refArb, { minLength: 1, maxLength: 4 }),
        fc.integer({ min: 1, max: 40 }),
        fc.constantFrom<'down' | 'right'>('down', 'right'),
        (refs, n, direction) => {
          const formula = `=${refs.map(formatRef).join('+')}`;
          const source = rect(10, 5);
          const writes = fillWrites(
            (row, col) => (row === 10 && col === 5 ? formula : ''),
            source,
            direction,
            n,
          );
          expect(writes).toHaveLength(n);
          writes.forEach((write, k) => {
            const offset = k + 1;
            const expected = refs.map((original) => {
              const row =
                direction === 'down' && !original.rowAbs ? original.row + offset : original.row;
              const col =
                direction === 'right' && !original.colAbs ? original.col + offset : original.col;
              // 시트(1000행 × 50열) 밖으로 나간 참조는 #REF!
              return row >= 1000 || col >= 50 ? null : { ...original, row, col };
            });
            expect(write.value).toBe(
              `=${expected.map((ref) => (ref === null ? '#REF!' : formatRef(ref))).join('+')}`,
            );
            // 남은 참조 토큰의 $ 고정도 원래와 같다
            const kept = expected.filter((ref) => ref !== null);
            scanReferences(write.value).forEach((token, i) => {
              expect(token.first.row?.absolute).toBe(kept[i]?.rowAbs);
              expect(token.first.col?.absolute).toBe(kept[i]?.colAbs);
            });
          });
        },
      ),
      { numRuns: 300 },
    );
  }, 30_000);
});

describe('WorkbookModel 자동 채우기', () => {
  const models: WorkbookModel[] = [];
  afterEach(() => {
    models.splice(0).forEach((model) => model.destroy());
  });

  it('채우기 결과가 계산되고 한 번에 실행 취소된다', async () => {
    const model = await WorkbookModel.create({
      sheets: [{ name: 'Sheet1', cells: { A1: '1', A2: '2', B1: '=A1*2' } }],
    });
    models.push(model);
    model.fill('Sheet1', rect(0, 0, 1, 0), 'down', 3);
    model.fill('Sheet1', rect(0, 1), 'down', 4);
    expect(model.getResult('Sheet1', 4, 0).value).toBe(5);
    expect(model.getInput('Sheet1', 4, 1)).toBe('=A5*2');
    expect(model.getResult('Sheet1', 4, 1).value).toBe(10);
    expect(model.history.undoLabel).toBe('자동 채우기');
    model.undo();
    expect(model.getInput('Sheet1', 4, 1)).toBe('');
    model.fillFromEdge('Sheet1', rect(0, 1, 2, 1), 'down');
    expect(model.getInput('Sheet1', 2, 1)).toBe('=A3*2');
    model.undo();
    expect(model.getInput('Sheet1', 2, 1)).toBe('');
  });
});

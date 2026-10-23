import { describe, expect, it } from 'vitest';

import {
  cellAddress,
  columnLabel,
  isInRange,
  selectionRange,
  selectionReducer,
  type SelectionState,
} from '@/components/spreadsheet/hooks/useCellSelection';

const bounds = { rowCount: 10, colCount: 5 };
const at = (row: number, col: number): SelectionState => ({
  anchor: { row, col },
  active: { row, col },
});

describe('selectionReducer', () => {
  it('select는 앵커와 활성 셀을 같은 곳으로 옮긴다', () => {
    expect(
      selectionReducer(at(0, 0), { type: 'select', position: { row: 3, col: 2 } }, bounds),
    ).toEqual(at(3, 2));
  });

  it('select는 그리드 밖 좌표를 가장자리로 잘라낸다', () => {
    expect(
      selectionReducer(at(0, 0), { type: 'select', position: { row: 99, col: -4 } }, bounds),
    ).toEqual(at(9, 0));
  });

  it('move는 화살표 한 칸 이동이고 가장자리에서 멈춘다', () => {
    const down = selectionReducer(
      at(0, 0),
      { type: 'move', dRow: 1, dCol: 0, extend: false },
      bounds,
    );
    expect(down).toEqual(at(1, 0));

    const left = selectionReducer(
      at(0, 0),
      { type: 'move', dRow: 0, dCol: -1, extend: false },
      bounds,
    );
    expect(left).toEqual(at(0, 0));

    const right = selectionReducer(
      at(4, 4),
      { type: 'move', dRow: 0, dCol: 1, extend: false },
      bounds,
    );
    expect(right).toEqual(at(4, 4));

    const pageDown = selectionReducer(
      at(8, 1),
      { type: 'move', dRow: 20, dCol: 0, extend: false },
      bounds,
    );
    expect(pageDown).toEqual(at(9, 1));
  });

  it('extend 이동(Shift+화살표)은 앵커를 고정한 채 활성 셀만 옮긴다', () => {
    let state = at(2, 2);
    state = selectionReducer(state, { type: 'move', dRow: 1, dCol: 0, extend: true }, bounds);
    state = selectionReducer(state, { type: 'move', dRow: 0, dCol: 1, extend: true }, bounds);
    expect(state).toEqual({ anchor: { row: 2, col: 2 }, active: { row: 3, col: 3 } });
    expect(selectionRange(state)).toEqual({ startRow: 2, startCol: 2, endRow: 3, endCol: 3 });
  });

  it('범위를 넓힌 뒤 일반 이동을 하면 범위가 풀리고 활성 셀 기준으로 움직인다', () => {
    const extended = selectionReducer(
      at(2, 2),
      { type: 'extendTo', position: { row: 5, col: 4 } },
      bounds,
    );
    const moved = selectionReducer(
      extended,
      { type: 'move', dRow: 1, dCol: 0, extend: false },
      bounds,
    );
    expect(moved).toEqual(at(6, 4));
  });

  it('extendTo(드래그·Shift+클릭)는 위·왼쪽 방향이어도 범위를 정규화한다', () => {
    const state = selectionReducer(
      at(5, 3),
      { type: 'extendTo', position: { row: 1, col: 0 } },
      bounds,
    );
    expect(state.anchor).toEqual({ row: 5, col: 3 });
    expect(selectionRange(state)).toEqual({ startRow: 1, startCol: 0, endRow: 5, endCol: 3 });
  });

  it('selectAll은 시트 전체를 범위로 잡고 활성 셀을 A1에 둔다', () => {
    const state = selectionReducer(at(4, 2), { type: 'selectAll' }, bounds);
    expect(state.active).toEqual({ row: 0, col: 0 });
    expect(selectionRange(state)).toEqual({ startRow: 0, startCol: 0, endRow: 9, endCol: 4 });
  });
});

describe('isInRange', () => {
  const range = { startRow: 1, startCol: 1, endRow: 3, endCol: 2 };
  it('경계를 포함해 범위 안 셀만 참이다', () => {
    expect(isInRange(range, 1, 1)).toBe(true);
    expect(isInRange(range, 3, 2)).toBe(true);
    expect(isInRange(range, 2, 3)).toBe(false);
    expect(isInRange(range, 0, 1)).toBe(false);
  });
});

describe('columnLabel / cellAddress', () => {
  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [51, 'AZ'],
    [52, 'BA'],
    [99, 'CV'],
    [701, 'ZZ'],
    [702, 'AAA'],
  ])('%i번째 열은 %s', (col, label) => {
    expect(columnLabel(col)).toBe(label);
  });

  it('행·열 인덱스를 A1 표기로 바꾼다', () => {
    expect(cellAddress({ row: 0, col: 0 })).toBe('A1');
    expect(cellAddress({ row: 9_999, col: 99 })).toBe('CV10000');
  });
});

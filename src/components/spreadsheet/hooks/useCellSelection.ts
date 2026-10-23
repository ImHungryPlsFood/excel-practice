import { useMemo, useReducer } from 'react';

import type { CellPosition, CellRange } from '../types';

/*
 * 셀 선택 모델 (ADR-002 §4.2).
 * anchor: 범위 확장의 고정점, active: 활성 셀(키보드 입력 대상).
 * 선택 범위는 항상 anchor와 active를 두 모서리로 하는 직사각형이다.
 */

export interface SelectionState {
  anchor: CellPosition;
  active: CellPosition;
}

export interface GridBounds {
  rowCount: number;
  colCount: number;
}

export type SelectionAction =
  | { type: 'select'; position: CellPosition }
  | { type: 'extendTo'; position: CellPosition }
  | { type: 'move'; dRow: number; dCol: number; extend: boolean }
  | { type: 'selectAll' }
  /** 열 머리글 클릭·끌기: from 열에서 to 열까지 전체 (CARD-02E) */
  | { type: 'selectColumns'; from: number; to: number }
  /** 행 머리글 클릭·끌기 */
  | { type: 'selectRows'; from: number; to: number }
  /** 범위를 직접 지정(붙여넣은 범위). 활성 셀은 왼쪽 위 */
  | { type: 'selectRange'; range: CellRange };

const clampIndex = (value: number, count: number): number =>
  Math.min(Math.max(value, 0), Math.max(count - 1, 0));

export const clampPosition = (position: CellPosition, bounds: GridBounds): CellPosition => ({
  row: clampIndex(position.row, bounds.rowCount),
  col: clampIndex(position.col, bounds.colCount),
});

export function selectionReducer(
  state: SelectionState,
  action: SelectionAction,
  bounds: GridBounds,
): SelectionState {
  switch (action.type) {
    case 'select': {
      const position = clampPosition(action.position, bounds);
      return { anchor: position, active: position };
    }
    case 'extendTo':
      return { anchor: state.anchor, active: clampPosition(action.position, bounds) };
    case 'move': {
      const next = clampPosition(
        { row: state.active.row + action.dRow, col: state.active.col + action.dCol },
        bounds,
      );
      return action.extend
        ? { anchor: state.anchor, active: next }
        : { anchor: next, active: next };
    }
    case 'selectAll':
      // Excel처럼 활성 셀은 그대로 두고 범위만 시트 전체로 넓힌다.
      return {
        anchor: { row: bounds.rowCount - 1, col: bounds.colCount - 1 },
        active: { row: 0, col: 0 },
      };
    case 'selectColumns': {
      // 활성 셀은 처음 누른 열의 맨 위, 반대 모서리는 끝 열의 맨 아래
      const from = clampIndex(action.from, bounds.colCount);
      const to = clampIndex(action.to, bounds.colCount);
      return { active: { row: 0, col: from }, anchor: { row: bounds.rowCount - 1, col: to } };
    }
    case 'selectRows': {
      const from = clampIndex(action.from, bounds.rowCount);
      const to = clampIndex(action.to, bounds.rowCount);
      return { active: { row: from, col: 0 }, anchor: { row: to, col: bounds.colCount - 1 } };
    }
    case 'selectRange': {
      const start = clampPosition(
        { row: action.range.startRow, col: action.range.startCol },
        bounds,
      );
      const end = clampPosition({ row: action.range.endRow, col: action.range.endCol }, bounds);
      return { active: start, anchor: end };
    }
  }
}

/** 범위가 열 전체(맨 위~맨 아래)인지 */
export const isWholeColumns = (range: CellRange, bounds: GridBounds): boolean =>
  range.startRow === 0 && range.endRow === bounds.rowCount - 1;

/** 범위가 행 전체인지 */
export const isWholeRows = (range: CellRange, bounds: GridBounds): boolean =>
  range.startCol === 0 && range.endCol === bounds.colCount - 1;

export const selectionRange = ({ anchor, active }: SelectionState): CellRange => ({
  startRow: Math.min(anchor.row, active.row),
  startCol: Math.min(anchor.col, active.col),
  endRow: Math.max(anchor.row, active.row),
  endCol: Math.max(anchor.col, active.col),
});

export const isInRange = (range: CellRange, row: number, col: number): boolean =>
  row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol;

/** 0 → A, 25 → Z, 26 → AA, 99 → CV */
export function columnLabel(col: number): string {
  let label = '';
  let n = col + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export const cellAddress = ({ row, col }: CellPosition): string => `${columnLabel(col)}${row + 1}`;

export function useCellSelection(bounds: GridBounds) {
  const [selection, dispatch] = useReducer(
    (state: SelectionState, action: SelectionAction) => selectionReducer(state, action, bounds),
    { anchor: { row: 0, col: 0 }, active: { row: 0, col: 0 } },
  );
  // 선택이 바뀔 때만 새 범위 객체를 만든다(스크롤 렌더마다 새 객체면 memo 컴포넌트가 다시 그려진다).
  const range = useMemo(() => selectionRange(selection), [selection]);
  return { selection, range, dispatch };
}

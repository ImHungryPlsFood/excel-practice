import { ENGINE_LIMITS } from '../FormulaEngineAdapter';

import {
  addressOf,
  adjustFormulaForStructure,
  columnLetters,
  columnNumber,
  positionOfAddress,
  type SheetBounds,
  type StructuralChange,
} from './referenceShift';

/*
 * 행·열 삽입·삭제·크기 (CARD-02E, R-08.06).
 * 시트 원문(A1 주소 → 입력 글자)을 받아 바뀐 원문을 돌려주는 순수 함수다. 실행 취소 기록은 WorkbookModel이 한다.
 *
 * 삽입·삭제 하나에서 일어나는 일 (Excel 규칙):
 *   1. 그 시트의 셀이 아래(오른쪽)로 밀리거나 위(왼쪽)로 당겨진다. 지운 행·열의 셀은 없어진다.
 *   2. 모든 시트의 수식에서 그 시트를 가리키는 참조가 같이 움직인다(referenceShift.adjustFormulaForStructure).
 *   3. 행 높이·열 너비도 같이 움직인다.
 * 시트 맨 끝 행·열에 값이 있어 밀려 나가야 하면 Excel처럼 삽입을 거부한다.
 */

export const DEFAULT_COLUMN_WIDTH = 96;
export const DEFAULT_ROW_HEIGHT = 24;
export const SIZE_LIMITS = {
  minColumnWidth: 24,
  maxColumnWidth: 600,
  minRowHeight: 16,
  maxRowHeight: 400,
} as const;

/** 시트 하나의 저장 형태. 크기는 기본값과 다른 것만 둔다(열은 문자, 행은 1부터 시작하는 번호가 키). */
export interface SheetContent {
  readonly name: string;
  readonly cells: Readonly<Record<string, string>>;
  readonly columnWidths?: Readonly<Record<string, number>>;
  readonly rowHeights?: Readonly<Record<string, number>>;
}

const ENGINE_BOUNDS: SheetBounds = {
  maxRows: ENGINE_LIMITS.maxRows,
  maxColumns: ENGINE_LIMITS.maxColumns,
};

const sameSheet = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** 단일 위치. 지워지면 null. */
function moveIndex(index: number, change: StructuralChange): number | null {
  const { kind, index: at, count } = change;
  if (kind === 'insert') return index >= at ? index + count : index;
  if (index < at) return index;
  if (index < at + count) return null;
  return index - count;
}

const axisLabel = (axis: StructuralChange['axis']) => (axis === 'row' ? '행' : '열');

/** 크기 키(열 문자 / 1부터 시작하는 행 번호)를 0부터 시작하는 위치로 */
export function sizeKeyIndex(key: string, axis: 'row' | 'col'): number | null {
  if (axis === 'col') {
    if (!/^[A-Z]{1,3}$/.test(key)) return null;
    return columnNumber(key) - 1;
  }
  if (!/^[1-9]\d*$/.test(key)) return null;
  return Number(key) - 1;
}

export const sizeKey = (index: number, axis: 'row' | 'col'): string =>
  axis === 'col' ? columnLetters(index) : String(index + 1);

function moveSizes(
  sizes: Readonly<Record<string, number>> | undefined,
  axis: 'row' | 'col',
  change: StructuralChange,
): Record<string, number> | undefined {
  if (sizes === undefined) return undefined;
  const moved: Record<string, number> = {};
  for (const [key, size] of Object.entries(sizes)) {
    const index = sizeKeyIndex(key, axis);
    if (index === null) continue;
    const next = change.axis === axis ? moveIndex(index, change) : index;
    if (next !== null) moved[sizeKey(next, axis)] = size;
  }
  return Object.keys(moved).length > 0 ? moved : undefined;
}

function withSizes(
  sheet: SheetContent,
  cells: Record<string, string>,
  columnWidths: Record<string, number> | undefined,
  rowHeights: Record<string, number> | undefined,
): SheetContent {
  return {
    name: sheet.name,
    cells,
    ...(columnWidths === undefined ? {} : { columnWidths }),
    ...(rowHeights === undefined ? {} : { rowHeights }),
  };
}

/** 삽입·삭제가 가능한지. 문제가 있으면 안내 문장. */
export function checkStructuralChange(
  sheets: readonly SheetContent[],
  change: StructuralChange,
  bounds: SheetBounds = ENGINE_BOUNDS,
): string | null {
  const limit = change.axis === 'row' ? bounds.maxRows : bounds.maxColumns;
  const label = axisLabel(change.axis);
  const target = sheets.find((sheet) => sameSheet(sheet.name, change.sheet));
  if (target === undefined) return `시트를 찾을 수 없습니다: ${change.sheet}`;
  if (!Number.isInteger(change.count) || change.count < 1 || change.count > limit) {
    return `${label} 수가 올바르지 않습니다.`;
  }
  if (
    !Number.isInteger(change.index) ||
    change.index < 0 ||
    change.index + (change.kind === 'delete' ? change.count : 1) > limit
  ) {
    return `${label} 위치가 시트 범위(${bounds.maxRows}행 × ${bounds.maxColumns}열)를 벗어났습니다.`;
  }
  if (change.kind === 'insert') {
    const firstPushedOut = limit - change.count;
    for (const address of Object.keys(target.cells)) {
      const position = positionOfAddress(address);
      if (position === null) continue;
      const index = change.axis === 'row' ? position.row : position.col;
      if (index >= Math.max(firstPushedOut, change.index)) {
        return `시트 끝(${change.axis === 'row' ? `${bounds.maxRows}행` : `${columnLetters(bounds.maxColumns - 1)}열`})에 값이 있어 ${label}을 삽입할 수 없습니다. 끝쪽 ${label}의 값을 지우거나 옮긴 뒤 다시 시도하세요.`;
      }
    }
  }
  return null;
}

/**
 * 행·열을 삽입하거나 삭제한 뒤의 시트 목록. 거부되면 { error }.
 * 수식 원문은 바뀐 참조 토큰만 다시 쓰고 나머지 글자는 그대로 둔다.
 */
export function applyStructuralChange(
  sheets: readonly SheetContent[],
  change: StructuralChange,
  bounds: SheetBounds = ENGINE_BOUNDS,
): { sheets: SheetContent[] } | { error: string } {
  const problem = checkStructuralChange(sheets, change, bounds);
  if (problem !== null) return { error: problem };

  const next = sheets.map((sheet) => {
    const isTarget = sameSheet(sheet.name, change.sheet);
    const cells: Record<string, string> = {};
    for (const [address, raw] of Object.entries(sheet.cells)) {
      const position = positionOfAddress(address);
      if (position === null) continue;
      let { row, col } = position;
      if (isTarget) {
        const moved = moveIndex(change.axis === 'row' ? row : col, change);
        if (moved === null) continue;
        if (change.axis === 'row') row = moved;
        else col = moved;
      }
      cells[addressOf(row, col)] = raw.startsWith('=')
        ? adjustFormulaForStructure(raw, sheet.name, change, bounds)
        : raw;
    }
    if (!isTarget) return withSizes(sheet, cells, sheet.columnWidths, sheet.rowHeights);
    return withSizes(
      sheet,
      cells,
      moveSizes(sheet.columnWidths, 'col', change),
      moveSizes(sheet.rowHeights, 'row', change),
    );
  });
  return { sheets: next };
}

/** 크기 값이 허용 범위인지 */
export function isValidSize(size: number, axis: 'row' | 'col'): boolean {
  const [min, max] =
    axis === 'col'
      ? [SIZE_LIMITS.minColumnWidth, SIZE_LIMITS.maxColumnWidth]
      : [SIZE_LIMITS.minRowHeight, SIZE_LIMITS.maxRowHeight];
  return Number.isInteger(size) && size >= min && size <= max;
}

/** 크기를 허용 범위의 정수로 맞춘다. */
export function clampSize(size: number, axis: 'row' | 'col'): number {
  const [min, max] =
    axis === 'col'
      ? [SIZE_LIMITS.minColumnWidth, SIZE_LIMITS.maxColumnWidth]
      : [SIZE_LIMITS.minRowHeight, SIZE_LIMITS.maxRowHeight];
  return Math.min(max, Math.max(min, Math.round(size)));
}

import { ENGINE_LIMITS } from '../FormulaEngineAdapter';

import {
  addressOf,
  adjustFormulaForMove,
  destinationRect,
  positionOfAddress,
  shiftFormulaForCopy,
  type CellMove,
  type CellRect,
  type SheetBounds,
} from './referenceShift';
import type { SheetContent } from './rowColumnOps';

/*
 * 복사·잘라내기·붙여넣기 (CARD-02E, R-08.07, R-08.17).
 *
 * - 시스템 클립보드(text/plain)에는 Excel처럼 화면 표시값을 탭·줄바꿈으로 구분한 TSV로 쓴다.
 *   값에 탭·줄바꿈·큰따옴표가 있으면 큰따옴표로 감싸고 안의 큰따옴표는 두 번 쓴다.
 * - 앱 안에서 복사한 내용은 원문(수식)을 따로 가지고 있다가, 붙여넣을 때 상대 참조를 옮긴다(shiftFormulaForCopy).
 * - 밖(다른 프로그램)에서 온 TSV는 신뢰하지 않는 입력이다. 크기를 시트 범위로 제한하고, 각 칸은 셀에 직접 입력한
 *   것과 같게 다룬다(수식 길이 상한 등은 엔진 입력 검사 그대로).
 * - 붙여넣을 범위가 복사한 크기의 배수면 반복해 채운다(Excel).
 * - 잘라내기는 붙여넣을 때 셀을 옮기고, 다른 수식이 가리키던 참조도 따라가게 한다(adjustFormulaForMove).
 */

const ENGINE_BOUNDS: SheetBounds = {
  maxRows: ENGINE_LIMITS.maxRows,
  maxColumns: ENGINE_LIMITS.maxColumns,
};

/** 밖에서 붙여넣는 글자 상한. 시트 전체(1000×50)에 수식 상한을 채운 크기보다 크면 읽지 않는다. */
export const MAX_PASTE_TEXT_LENGTH = 5_000_000;

export interface CellWrite {
  row: number;
  col: number;
  value: string;
}

function needsQuotes(value: string): boolean {
  return (
    value.includes('\t') || value.includes('\n') || value.includes('\r') || value.includes('"')
  );
}

/** 2차원 값을 TSV로 (행은 \r\n, Excel과 같음) */
export function toTsv(rows: readonly (readonly string[])[]): string {
  return rows
    .map((cells) =>
      cells
        .map((value) => {
          if (!needsQuotes(value)) return value;
          let escaped = '';
          for (const ch of value) escaped += ch === '"' ? '""' : ch;
          return `"${escaped}"`;
        })
        .join('\t'),
    )
    .join('\r\n');
}

/**
 * TSV를 2차원 값으로. 큰따옴표로 감싼 칸 안의 탭·줄바꿈은 글자로 본다.
 * 끝의 줄바꿈 하나는 무시한다(Excel은 복사한 글자 끝에 줄바꿈을 붙인다). 행마다 칸 수가 다르면 짧은 행을 빈 칸으로 채운다.
 */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  let quoted = false;
  let cellStart = true;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && cellStart) {
      quoted = true;
      cellStart = false;
      i += 1;
    } else if (ch === '\t') {
      row.push(cell);
      cell = '';
      cellStart = true;
      i += 1;
    } else if (ch === '\r' || ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      cellStart = true;
      i += ch === '\r' && text.charAt(i + 1) === '\n' ? 2 : 1;
    } else {
      cell += ch;
      cellStart = false;
      i += 1;
    }
  }
  if (!cellStart || cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const width = Math.max(0, ...rows.map((cells) => cells.length));
  return rows.map((cells) => [...cells, ...Array<string>(width - cells.length).fill('')]);
}

export interface PasteSource {
  /** 붙여넣을 원문 (행 우선) */
  values: readonly (readonly string[])[];
  /** 앱 안에서 복사했으면 복사한 범위의 왼쪽 위 셀. 상대 참조를 옮길 기준이다. 밖에서 왔으면 null. */
  origin: { row: number; col: number } | null;
}

/**
 * 붙여넣을 셀 목록. target은 지금 선택 범위다.
 * 선택 범위가 복사한 크기의 배수(한 칸보다 큼)면 그 범위를 반복해 채우고, 아니면 왼쪽 위부터 복사한 크기만큼 넣는다.
 */
export function pasteWrites(
  source: PasteSource,
  target: CellRect,
  bounds: SheetBounds = ENGINE_BOUNDS,
): { writes: CellWrite[]; rect: CellRect } | { error: string } {
  const height = source.values.length;
  const width = Math.max(0, ...source.values.map((cells) => cells.length));
  if (height === 0 || width === 0) return { error: '붙여넣을 내용이 없습니다.' };

  const targetHeight = target.endRow - target.startRow + 1;
  const targetWidth = target.endCol - target.startCol + 1;
  const tiles =
    (targetHeight > height || targetWidth > width) &&
    targetHeight % height === 0 &&
    targetWidth % width === 0;
  const rect: CellRect = {
    startRow: target.startRow,
    startCol: target.startCol,
    endRow: target.startRow + (tiles ? targetHeight : height) - 1,
    endCol: target.startCol + (tiles ? targetWidth : width) - 1,
  };
  if (rect.endRow >= bounds.maxRows || rect.endCol >= bounds.maxColumns) {
    return {
      error: `붙여넣을 내용(${height}행 × ${width}열)이 시트 범위(${bounds.maxRows}행 × ${bounds.maxColumns}열)를 벗어납니다. 더 위쪽·왼쪽 셀을 고른 뒤 다시 붙여넣으세요.`,
    };
  }

  const writes: CellWrite[] = [];
  for (let row = rect.startRow; row <= rect.endRow; row += 1) {
    for (let col = rect.startCol; col <= rect.endCol; col += 1) {
      const r = (row - rect.startRow) % height;
      const c = (col - rect.startCol) % width;
      const raw = source.values[r]?.[c] ?? '';
      const value =
        source.origin !== null && raw.startsWith('=')
          ? shiftFormulaForCopy(
              raw,
              row - (source.origin.row + r),
              col - (source.origin.col + c),
              bounds,
            )
          : raw;
      writes.push({ row, col, value });
    }
  }
  return { writes, rect };
}

const sameSheet = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

const inRect = (rect: CellRect, row: number, col: number) =>
  row >= rect.startRow && row <= rect.endRow && col >= rect.startCol && col <= rect.endCol;

/**
 * 잘라낸 셀을 옮긴 뒤의 시트 목록. 옮긴 셀의 원문(수식 글자 포함)은 그대로 옮기고,
 * 모든 수식에서 옮긴 셀을 가리키던 참조를 새 위치로, 덮어쓴 셀을 가리키던 참조를 #REF!로 바꾼다.
 */
export function moveCells(
  sheets: readonly SheetContent[],
  move: CellMove,
  bounds: SheetBounds = ENGINE_BOUNDS,
): { sheets: SheetContent[] } | { error: string } {
  const destination = destinationRect(move);
  if (
    destination.startRow < 0 ||
    destination.startCol < 0 ||
    destination.endRow >= bounds.maxRows ||
    destination.endCol >= bounds.maxColumns
  ) {
    return { error: '옮길 위치가 시트 범위를 벗어납니다.' };
  }
  if (!sheets.some((sheet) => sameSheet(sheet.name, move.fromSheet))) {
    return { error: `시트를 찾을 수 없습니다: ${move.fromSheet}` };
  }
  if (!sheets.some((sheet) => sameSheet(sheet.name, move.toSheet))) {
    return { error: `시트를 찾을 수 없습니다: ${move.toSheet}` };
  }

  const adjust = (raw: string, before: string, after: string) =>
    raw.startsWith('=') ? adjustFormulaForMove(raw, before, after, move) : raw;

  // 옮기는 셀 (원래 시트 기준으로 참조를 고친 뒤 새 자리에 놓는다)
  const moving: CellWrite[] = [];
  const source = sheets.find((sheet) => sameSheet(sheet.name, move.fromSheet));
  const targetName =
    sheets.find((sheet) => sameSheet(sheet.name, move.toSheet))?.name ?? move.toSheet;
  for (const [address, raw] of Object.entries(source?.cells ?? {})) {
    const position = positionOfAddress(address);
    if (position === null || !inRect(move.rect, position.row, position.col)) continue;
    moving.push({
      row: position.row + move.dRow,
      col: position.col + move.dCol,
      value: adjust(raw, source?.name ?? move.fromSheet, targetName),
    });
  }

  const next = sheets.map((sheet) => {
    const isSource = sameSheet(sheet.name, move.fromSheet);
    const isTarget = sameSheet(sheet.name, move.toSheet);
    const cells: Record<string, string> = {};
    for (const [address, raw] of Object.entries(sheet.cells)) {
      const position = positionOfAddress(address);
      if (position === null) continue;
      if (isSource && inRect(move.rect, position.row, position.col)) continue;
      if (isTarget && inRect(destination, position.row, position.col)) continue;
      cells[address] = adjust(raw, sheet.name, sheet.name);
    }
    if (isTarget) {
      for (const { row, col, value } of moving) cells[addressOf(row, col)] = value;
    }
    return { ...sheet, cells };
  });
  return { sheets: next };
}

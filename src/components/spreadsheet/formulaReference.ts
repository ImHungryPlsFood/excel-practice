import {
  columnLetters,
  formatCellReference,
  formatSheetPrefix,
  parseCellReference,
  scanReferences,
  skipQuoted,
  type CellReferenceParts,
} from '@/engine/spreadsheet/operations/referenceShift';

import type { CellRange } from './types';

/*
 * 수식 편집 중 참조 다루기.
 *
 * F4 참조 고정 순환 (CARD-02C, TEST_STRATEGY Q-04·Q-06): 커서가 놓인 셀 참조의 $ 고정을 Excel 순서로 바꾼다.
 *   A1 → $A$1 → A$1 → $A1 → A1
 * 포인트 모드 참조 넣기·바꾸기 (CARD-02E, R-08.02): 수식 편집 중 셀을 클릭·드래그하면 커서 자리에 참조를 넣는다.
 *
 * 정규식 하나로 찾으면 문자열("A1")이나 시트 이름('A1 시트'!B2) 안의 글자, 함수 이름(LOG10)까지 바뀌므로
 * 참조 이동(referenceShift.ts)과 같은 토큰 읽기(scanReferences)로 참조 토큰만 다룬다.
 */

export { formatCellReference, parseCellReference, type CellReferenceParts };

/** Excel F4 순서의 다음 고정 상태 */
export function nextReferenceLock(parts: CellReferenceParts): CellReferenceParts {
  const { colAbsolute, rowAbsolute } = parts;
  if (!colAbsolute && !rowAbsolute) return { ...parts, colAbsolute: true, rowAbsolute: true };
  if (colAbsolute && rowAbsolute) return { ...parts, colAbsolute: false, rowAbsolute: true };
  if (!colAbsolute && rowAbsolute) return { ...parts, colAbsolute: true, rowAbsolute: false };
  return { ...parts, colAbsolute: false, rowAbsolute: false };
}

export interface ToggleResult {
  text: string;
  caret: number;
  /** 바꿀 참조가 없어 그대로면 false */
  changed: boolean;
}

/**
 * 커서(caret, 0부터)가 놓인 셀 참조의 고정 상태를 한 단계 바꾼다. 커서가 참조 바로 뒤에 있어도 그 참조로 본다.
 * 범위는 커서가 있는 끝점만 바꾼다. 함수 이름, 시트 이름, 문자열 안의 글자는 바꾸지 않는다.
 */
export function toggleReferenceAt(text: string, caret: number): ToggleResult {
  for (const token of scanReferences(text)) {
    const endpoints = token.second === null ? [token.first] : [token.first, token.second];
    for (const { start, end } of endpoints) {
      if (caret < start || caret > end) continue;
      const parts = parseCellReference(text.slice(start, end));
      if (parts === null) continue;
      const replacement = formatCellReference(nextReferenceLock(parts));
      return {
        text: text.slice(0, start) + replacement + text.slice(end),
        caret: start + replacement.length,
        changed: true,
      };
    }
  }
  return { text, caret, changed: false };
}

// ---- 포인트 모드 (CARD-02E) ----

/** 이 글자 바로 뒤에는 참조를 넣을 수 있다(Excel 포인트 모드 진입 자리). */
const INSERTABLE_AFTER = new Set(['=', '+', '-', '*', '/', '^', '&', '<', '>', '(', ',', ':']);

/** 커서가 큰따옴표 문자열 안에 있는지 */
function insideString(text: string, caret: number): boolean {
  let i = 0;
  while (i < caret) {
    const ch = text.charAt(i);
    if (ch === '"' || ch === "'") {
      const end = skipQuoted(text, i);
      if (end > caret || (end === text.length && text.charAt(end - 1) !== ch)) return true;
      i = end;
    } else {
      i += 1;
    }
  }
  return false;
}

/**
 * 수식 편집 중 커서 자리에 셀 클릭으로 참조를 넣을 수 있는지.
 * '=', 연산자, '(', ',', ':' 바로 뒤이고, 바로 뒤에 다른 단어가 붙어 있지 않을 때만이다.
 */
export function canInsertReferenceAt(text: string, caret: number): boolean {
  if (!text.startsWith('=') || caret < 1 || caret > text.length) return false;
  if (!INSERTABLE_AFTER.has(text.charAt(caret - 1))) return false;
  const following = text.charAt(caret);
  if (following !== '' && /[\p{L}\p{N}_.$'"]/u.test(following)) return false;
  return !insideString(text, caret);
}

export interface TextSpan {
  start: number;
  end: number;
}

export interface InsertResult {
  text: string;
  caret: number;
  /** 넣은 참조가 차지하는 구간. 다음 클릭은 이 구간을 바꾼다. */
  span: TextSpan;
}

/** 커서 자리에 참조를 넣거나, span이 있으면 그 구간(직전에 넣은 참조)을 바꾼다. 커서는 참조 끝에 둔다. */
export function insertOrReplaceReference(
  text: string,
  caret: number,
  span: TextSpan | null,
  reference: string,
): InsertResult {
  const start = span?.start ?? caret;
  const end = span?.end ?? caret;
  return {
    text: text.slice(0, start) + reference + text.slice(end),
    caret: start + reference.length,
    span: { start, end: start + reference.length },
  };
}

/**
 * 포인트 모드로 넣을 참조 글자. 한 칸이면 B3, 여러 칸이면 B3:B7.
 * 편집 중인 수식의 시트(formulaSheet)와 다른 시트면 Sheet2!B3처럼 접두를 붙이고,
 * 공백·특수문자가 있는 이름은 작은따옴표로 감싼다('My Data'!B3).
 */
export function formatPointReference(
  range: CellRange,
  sheet: string,
  formulaSheet: string,
): string {
  const cell = (row: number, col: number) => `${columnLetters(col)}${row + 1}`;
  const body =
    range.startRow === range.endRow && range.startCol === range.endCol
      ? cell(range.startRow, range.startCol)
      : `${cell(range.startRow, range.startCol)}:${cell(range.endRow, range.endCol)}`;
  return sheet === formulaSheet ? body : formatSheetPrefix(sheet) + body;
}

/** 수식이 가리키는 범위(색 테두리 표시용). sheet는 지금 보는 시트이고, 그 시트를 가리키는 셀·범위 참조만 돌려준다. */
export function referencedRanges(
  formula: string,
  formulaSheet: string,
  sheet: string,
): CellRange[] {
  const ranges: CellRange[] = [];
  for (const token of scanReferences(formula)) {
    const target = token.sheet ?? formulaSheet;
    if (target.toLocaleLowerCase() !== sheet.toLocaleLowerCase()) continue;
    const a = token.first;
    const b = token.second ?? token.first;
    if (a.row === null || a.col === null || b.row === null || b.col === null) continue;
    ranges.push({
      startRow: Math.min(a.row.index, b.row.index),
      startCol: Math.min(a.col.index, b.col.index),
      endRow: Math.max(a.row.index, b.row.index),
      endCol: Math.max(a.col.index, b.col.index),
    });
  }
  return ranges;
}

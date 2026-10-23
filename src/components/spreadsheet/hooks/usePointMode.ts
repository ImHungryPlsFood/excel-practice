import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  canInsertReferenceAt,
  formatPointReference,
  insertOrReplaceReference,
  type TextSpan,
} from '../formulaReference';
import type { CellPosition, CellRange } from '../types';
import type { CellEditingController } from './useCellEditing';

/*
 * 포인트 모드 (CARD-02E, R-08.02 수식 편집 중 범위 선택, 튜토리얼 R-07.05·R-07.06의 전제).
 *
 * 수식을 편집 중이고 커서가 참조를 넣을 수 있는 자리('=', 연산자, '(', ',', ':' 바로 뒤, 또는 직전에 넣은 참조 위)에 있을 때
 * 셀을 클릭하면 B3, 드래그·Shift+클릭하면 B3:B7을 커서 자리에 넣는다. 드래그하는 동안 실시간으로 바뀐다.
 * 셀에 바로 타이핑해 시작한 편집(enter 모드)에서는 화살표·Shift+화살표도 참조를 움직인다.
 * 다른 시트를 보며 넣으면 Sheet2!B3처럼 시트 이름이 붙는다.
 *
 * - 한글 조합 중에는 켜지 않는다(editor.isComposing, Q-05).
 * - 참조 넣기는 formulaReference.ts의 토큰 단위 함수로 한다(정규식 치환 없음).
 * - 포인트 모드 중 이동은 실행 취소 대상이 아니다. Enter로 확정한 수식만 historyManager 명령이 된다.
 * - 시작·참조 변경·종료를 onChange로 알린다(튜토리얼 CARD-03B가 "범위를 드래그해 SUM 인수 넣기"를 확인한다).
 * 마우스 이벤트는 렌더 사이에 연달아 오므로 편집 상태는 editor.getEditing()(최신 값)으로 읽는다.
 */

export interface PointModeEvent {
  type: 'start' | 'change' | 'end';
  /** 넣은 참조 글자(B3:B7, Sheet2!A1). end면 마지막으로 넣은 참조 */
  reference: string;
  /** 참조가 가리키는 시트 */
  sheet: string;
  range: CellRange;
  /** 참조를 넣은 뒤의 수식 */
  formula: string;
}

interface PointState {
  anchor: CellPosition;
  active: CellPosition;
  /** 넣은 참조가 차지하는 글자 구간 */
  span: TextSpan;
  /** 참조를 넣은 직후의 초안. 그 뒤 사용자가 글자를 바꾸면 이 참조는 더는 바꾸지 않는다. */
  draft: string;
  sheet: string;
  reference: string;
}

export interface PointModeController {
  /** 지금 보는 시트에서 넣은(끌고 있는) 참조 범위. 없으면 null */
  range: CellRange | null;
  dragging: boolean;
  /** 지금 커서 자리에서 포인트 모드를 시작(또는 이어 가기)할 수 있는지 */
  canPoint: () => boolean;
  /** 셀 누름. 포인트 모드로 처리했으면 true(편집 확정·선택 대신) */
  pointerDown: (position: CellPosition, extend: boolean) => boolean;
  /** 누른 채 움직임 */
  pointerMove: (position: CellPosition) => void;
  pointerUp: () => void;
  /** enter 모드 화살표. 처리했으면 true */
  arrow: (dRow: number, dCol: number, extend: boolean) => boolean;
  /** 다른 시트 탭을 눌렀을 때: 그 시트의 position 셀 참조를 넣는다. 처리했으면 true */
  pointSheet: (sheet: string, position: CellPosition) => boolean;
}

interface UsePointModeOptions {
  editor: CellEditingController;
  /** 지금 보는 시트 */
  viewedSheet: string;
  rowCount: number;
  colCount: number;
  onChange?: (event: PointModeEvent) => void;
}

const clamp = (value: number, count: number) => Math.min(Math.max(value, 0), count - 1);

const rangeOf = (a: CellPosition, b: CellPosition): CellRange => ({
  startRow: Math.min(a.row, b.row),
  startCol: Math.min(a.col, b.col),
  endRow: Math.max(a.row, b.row),
  endCol: Math.max(a.col, b.col),
});

export function usePointMode({
  editor,
  viewedSheet,
  rowCount,
  colCount,
  onChange,
}: UsePointModeOptions): PointModeController {
  const [point, setPointState] = useState<PointState | null>(null);
  const pointRef = useRef<PointState | null>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const listenerRef = useRef(onChange);
  useLayoutEffect(() => {
    listenerRef.current = onChange;
  });

  const setPoint = useCallback((next: PointState | null) => {
    pointRef.current = next;
    setPointState(next);
  }, []);

  const { editing } = editor;

  // 편집이 끝나면(확정·취소) 포인트 모드도 끝난다.
  useLayoutEffect(() => {
    const last = pointRef.current;
    if (editing === null && last !== null) {
      draggingRef.current = false;
      setPoint(null);
      setDragging(false);
      listenerRef.current?.({
        type: 'end',
        reference: last.reference,
        sheet: last.sheet,
        range: rangeOf(last.anchor, last.active),
        formula: last.draft,
      });
    }
  }, [editing, setPoint]);

  /** 직전에 넣은 참조가 아직 유효한지(그 뒤로 초안이 바뀌지 않았는지) */
  const currentSpan = useCallback((): TextSpan | null => {
    const current = pointRef.current;
    const draft = editor.getEditing()?.draft;
    return current !== null && draft === current.draft ? current.span : null;
  }, [editor]);

  const canPoint = useCallback((): boolean => {
    const state = editor.getEditing();
    if (state === null || !state.draft.startsWith('=') || editor.isComposing()) return false;
    if (currentSpan() !== null) return true;
    return canInsertReferenceAt(state.draft, editor.getCaret());
  }, [editor, currentSpan]);

  const place = useCallback(
    (anchor: CellPosition, active: CellPosition, sheet: string) => {
      const state = editor.getEditing();
      if (state === null) return;
      const range = rangeOf(anchor, active);
      const reference = formatPointReference(range, sheet, state.sheet ?? sheet);
      const span = currentSpan();
      const inserted = insertOrReplaceReference(state.draft, editor.getCaret(), span, reference);
      editor.update(inserted.text, inserted.caret);
      setPoint({ anchor, active, span: inserted.span, draft: inserted.text, sheet, reference });
      listenerRef.current?.({
        type: span === null ? 'start' : 'change',
        reference,
        sheet,
        range,
        formula: inserted.text,
      });
    },
    [editor, currentSpan, setPoint],
  );

  const pointerDown = useCallback(
    (position: CellPosition, extend: boolean): boolean => {
      if (!canPoint()) return false;
      const current = currentSpan() !== null ? pointRef.current : null;
      const anchor =
        extend && current !== null && current.sheet === viewedSheet ? current.anchor : position;
      place(anchor, position, viewedSheet);
      draggingRef.current = true;
      setDragging(true);
      return true;
    },
    [canPoint, currentSpan, place, viewedSheet],
  );

  const pointerMove = useCallback(
    (position: CellPosition) => {
      const current = pointRef.current;
      if (!draggingRef.current || current === null) return;
      if (current.active.row === position.row && current.active.col === position.col) return;
      place(current.anchor, position, current.sheet);
    },
    [place],
  );

  const pointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
  }, []);

  const arrow = useCallback(
    (dRow: number, dCol: number, extend: boolean): boolean => {
      const state = editor.getEditing();
      if (state === null || state.mode !== 'enter' || !canPoint()) return false;
      const current = currentSpan() !== null ? pointRef.current : null;
      const base = current?.active ?? { row: state.row, col: state.col };
      const next = { row: clamp(base.row + dRow, rowCount), col: clamp(base.col + dCol, colCount) };
      const anchor = extend ? (current?.anchor ?? base) : next;
      place(anchor, next, current?.sheet ?? viewedSheet);
      return true;
    },
    [editor, canPoint, currentSpan, rowCount, colCount, place, viewedSheet],
  );

  const pointSheet = useCallback(
    (sheet: string, position: CellPosition): boolean => {
      if (!canPoint()) return false;
      place(position, position, sheet);
      return true;
    },
    [canPoint, place],
  );

  const range =
    point !== null && point.sheet === viewedSheet && editing?.draft === point.draft
      ? rangeOf(point.anchor, point.active)
      : null;

  return useMemo(
    () => ({ range, dragging, canPoint, pointerDown, pointerMove, pointerUp, arrow, pointSheet }),
    [range, dragging, canPoint, pointerDown, pointerMove, pointerUp, arrow, pointSheet],
  );
}

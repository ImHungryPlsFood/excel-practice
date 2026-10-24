import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { CellChange } from '../types';

/*
 * 셀 편집 상태 (CARD-02C). 셀 위 편집기(CellEditor)와 수식 입력줄(FormulaBar)이 이 컨트롤러 하나를 함께 쓴다.
 * 어느 쪽에서 입력해도 같은 초안이 양쪽에 보이고, 확정은 commit() 한 곳을 거쳐 같은 방식으로 엔진에 반영된다.
 *
 * 편집 모드 두 가지 (Excel 방식, CARD-02A에서 이어짐):
 * - enter: 셀에 바로 타이핑해 시작. 화살표를 누르면 확정하고 이동한다(포인트 모드가 켜질 자리면 참조를 움직인다).
 * - edit: F2·더블클릭·수식 입력줄로 시작. 화살표는 글자 사이 커서를 움직인다.
 *
 * CARD-02E 포인트 모드용으로 더한 것:
 * - sheet: 편집을 시작한 시트. 다른 시트를 보며 참조를 넣어도 확정은 이 시트에 한다.
 * - 커서 위치: 포커스가 있는 입력 상자가 setCaret으로 알리고, 참조를 넣은 뒤 놓을 위치는 editing.caret으로 요청한다.
 * - 한글 조합 중 여부: 조합 중에는 포인트 모드를 켜지 않는다(useImeInput, Q-05).
 */

export interface EditingState {
  row: number;
  col: number;
  draft: string;
  mode: 'enter' | 'edit';
  /** 편집을 시작한 시트. 없으면 지금 보는 시트 */
  sheet?: string;
  /** 프로그램이 초안을 바꾼 뒤(참조 넣기) 입력 상자가 커서를 놓을 위치 */
  caret?: number;
}

export interface CellEditingController {
  editing: EditingState | null;
  /** 직전 확정이 거부된 이유(수식 길이 상한 등). 편집은 그대로 열려 있다. */
  rejection: string | null;
  begin: (state: EditingState) => void;
  /** 초안을 바꾼다. caret을 주면 입력 상자가 그 자리에 커서를 놓는다. */
  update: (draft: string, caret?: number) => void;
  /**
   * 초안을 확정한다. 편집이 닫혔으면(반영했거나 바뀐 것이 없으면) true, 거부되어 편집이 계속되면 false.
   * 같은 편집을 두 번 반영하지 않는다(입력줄 blur와 셀 클릭이 겹치는 경우).
   */
  commit: () => boolean;
  cancel: () => void;
  /** 포커스가 있는 입력 상자의 커서 위치를 알린다(렌더 없음). */
  setCaret: (caret: number) => void;
  /** 마지막으로 알린 커서 위치. 알린 적이 없으면 초안 끝 */
  getCaret: () => number;
  setComposing: (composing: boolean) => void;
  isComposing: () => boolean;
  /** 렌더를 기다리지 않은 최신 편집 상태(연달아 오는 마우스 이벤트용) */
  getEditing: () => EditingState | null;
}

export interface UseCellEditingOptions {
  /** 셀 원문. 초안이 원문과 같으면 반영하지 않는다. */
  getCellValue: (row: number, col: number) => string;
  /** 변경 반영. 거부하면 안내 문장을 돌려준다. */
  applyChanges: (changes: readonly CellChange[]) => string | null;
  /** 편집을 시작할 때의 시트(여러 시트 통합 문서). 없으면 시트를 구분하지 않는다. */
  currentSheet?: () => string;
  /** 지정한 시트의 셀 원문. 편집 시트가 있으면 getCellValue 대신 쓴다. */
  getCellValueOf?: (sheet: string, row: number, col: number) => string;
  /** 지정한 시트에 반영. 편집 시트가 있으면 applyChanges 대신 쓴다. */
  applyChangesTo?: (sheet: string, changes: readonly CellChange[]) => string | null;
}

export function useCellEditing(options: UseCellEditingOptions): CellEditingController {
  const [editing, setEditingState] = useState<EditingState | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  // 이벤트가 연달아 올 때(blur 직후 mousedown 등) 렌더를 기다리지 않고 최신 편집 상태를 보도록 ref에도 둔다.
  const editingRef = useRef<EditingState | null>(null);
  const caretRef = useRef<number | null>(null);
  const composingRef = useRef(false);
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const setEditing = useCallback((next: EditingState | null) => {
    editingRef.current = next;
    setEditingState(next);
  }, []);

  const begin = useCallback(
    (state: EditingState) => {
      setRejection(null);
      caretRef.current = state.draft.length;
      setEditing({ ...state, sheet: state.sheet ?? optionsRef.current.currentSheet?.() });
    },
    [setEditing],
  );

  const update = useCallback(
    (draft: string, caret?: number) => {
      const current = editingRef.current;
      if (current === null) return;
      setRejection(null);
      if (caret !== undefined) caretRef.current = caret;
      const next: EditingState = { ...current, draft };
      if (caret === undefined) delete next.caret;
      else next.caret = caret;
      setEditing(next);
    },
    [setEditing],
  );

  const commit = useCallback((): boolean => {
    const current = editingRef.current;
    if (current === null) return true;
    const { getCellValue, applyChanges, getCellValueOf, applyChangesTo } = optionsRef.current;
    const { sheet } = current;
    const original =
      sheet !== undefined && getCellValueOf !== undefined
        ? getCellValueOf(sheet, current.row, current.col)
        : getCellValue(current.row, current.col);
    if (current.draft !== original) {
      const changes = [{ row: current.row, col: current.col, value: current.draft }];
      const refused =
        sheet !== undefined && applyChangesTo !== undefined
          ? applyChangesTo(sheet, changes)
          : applyChanges(changes);
      if (refused !== null) {
        setRejection(refused);
        return false;
      }
    }
    setRejection(null);
    setEditing(null);
    // 편집이 끝나면 입력 상자 값이 바뀌며 조합도 끝난다(Chromium은 이때 compositionend를 보내지 않는다, useImeInput 참고).
    composingRef.current = false;
    return true;
  }, [setEditing]);

  const cancel = useCallback(() => {
    setRejection(null);
    setEditing(null);
    composingRef.current = false;
  }, [setEditing]);

  const setCaret = useCallback((caret: number) => {
    caretRef.current = caret;
  }, []);

  const getCaret = useCallback(() => caretRef.current ?? editingRef.current?.draft.length ?? 0, []);

  const setComposing = useCallback((composing: boolean) => {
    composingRef.current = composing;
  }, []);

  const isComposing = useCallback(() => composingRef.current, []);

  const getEditing = useCallback(() => editingRef.current, []);

  return useMemo(
    () => ({
      editing,
      rejection,
      begin,
      update,
      commit,
      cancel,
      setCaret,
      getCaret,
      setComposing,
      isComposing,
      getEditing,
    }),
    [
      editing,
      rejection,
      begin,
      update,
      commit,
      cancel,
      setCaret,
      getCaret,
      setComposing,
      isComposing,
      getEditing,
    ],
  );
}

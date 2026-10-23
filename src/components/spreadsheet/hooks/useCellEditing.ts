import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { CellChange } from '../types';

/*
 * 셀 편집 상태 (CARD-02C). 셀 위 편집기(CellEditor)와 수식 입력줄(FormulaBar)이 이 컨트롤러 하나를 함께 쓴다.
 * 어느 쪽에서 입력해도 같은 초안이 양쪽에 보이고, 확정은 commit() 한 곳을 거쳐 같은 방식으로 엔진에 반영된다.
 *
 * 편집 모드 두 가지 (Excel 방식, CARD-02A에서 이어짐):
 * - enter: 셀에 바로 타이핑해 시작. 화살표를 누르면 확정하고 이동한다.
 * - edit: F2·더블클릭·수식 입력줄로 시작. 화살표는 글자 사이 커서를 움직인다.
 */

export interface EditingState {
  row: number;
  col: number;
  draft: string;
  mode: 'enter' | 'edit';
}

export interface CellEditingController {
  editing: EditingState | null;
  /** 직전 확정이 거부된 이유(수식 길이 상한 등). 편집은 그대로 열려 있다. */
  rejection: string | null;
  begin: (state: EditingState) => void;
  update: (draft: string) => void;
  /**
   * 초안을 확정한다. 편집이 닫혔으면(반영했거나 바뀐 것이 없으면) true, 거부되어 편집이 계속되면 false.
   * 같은 편집을 두 번 반영하지 않는다(입력줄 blur와 셀 클릭이 겹치는 경우).
   */
  commit: () => boolean;
  cancel: () => void;
}

export interface UseCellEditingOptions {
  /** 셀 원문. 초안이 원문과 같으면 반영하지 않는다. */
  getCellValue: (row: number, col: number) => string;
  /** 변경 반영. 거부하면 안내 문장을 돌려준다. */
  applyChanges: (changes: readonly CellChange[]) => string | null;
}

export function useCellEditing(options: UseCellEditingOptions): CellEditingController {
  const [editing, setEditingState] = useState<EditingState | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  // 이벤트가 연달아 올 때(blur 직후 mousedown 등) 렌더를 기다리지 않고 최신 편집 상태를 보도록 ref에도 둔다.
  const editingRef = useRef<EditingState | null>(null);
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
      setEditing(state);
    },
    [setEditing],
  );

  const update = useCallback(
    (draft: string) => {
      const current = editingRef.current;
      if (current === null) return;
      setRejection(null);
      setEditing({ ...current, draft });
    },
    [setEditing],
  );

  const commit = useCallback((): boolean => {
    const current = editingRef.current;
    if (current === null) return true;
    const { getCellValue, applyChanges } = optionsRef.current;
    if (current.draft !== getCellValue(current.row, current.col)) {
      const refused = applyChanges([{ row: current.row, col: current.col, value: current.draft }]);
      if (refused !== null) {
        setRejection(refused);
        return false;
      }
    }
    setRejection(null);
    setEditing(null);
    return true;
  }, [setEditing]);

  const cancel = useCallback(() => {
    setRejection(null);
    setEditing(null);
  }, [setEditing]);

  return useMemo(
    () => ({ editing, rejection, begin, update, commit, cancel }),
    [editing, rejection, begin, update, commit, cancel],
  );
}

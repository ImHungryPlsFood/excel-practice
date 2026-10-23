import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  canInsertReferenceAt,
  formatPointReference,
  insertOrReplaceReference,
  referencedRanges,
} from '@/components/spreadsheet/formulaReference';
import { useCellEditing } from '@/components/spreadsheet/hooks/useCellEditing';
import { usePointMode, type PointModeEvent } from '@/components/spreadsheet/hooks/usePointMode';

/*
 * CARD-02E 포인트 모드 (R-08.02 수식 편집 중 범위 선택).
 */

const range = (startRow: number, startCol: number, endRow = startRow, endCol = startCol) => ({
  startRow,
  startCol,
  endRow,
  endCol,
});

describe('canInsertReferenceAt', () => {
  it.each([
    ['=', 1],
    ['=SUM(', 5],
    ['=A1+', 4],
    ['=SUM(A1,', 8],
    ['=A1:', 4],
    ['=(', 2],
    ['=A1&', 4],
    ['=A1>=', 5],
  ])('%s 의 %i 자리에는 넣을 수 있다', (text, caret) => {
    expect(canInsertReferenceAt(text, caret)).toBe(true);
  });

  it.each([
    ['수식이 아님', 'SUM(', 4],
    ['참조 바로 뒤', '=A1', 3],
    ['함수 이름 중간', '=SU', 3],
    ['큰따옴표 문자열 안', '="a,', 4],
    ['뒤에 단어가 붙어 있음', '=SUM(A1)', 5],
    ['닫는 괄호 뒤', '=SUM(A1)', 8],
    ['맨 앞', '=', 0],
  ])('%s: 넣을 수 없다', (_label, text, caret) => {
    expect(canInsertReferenceAt(text, caret)).toBe(false);
  });
});

describe('참조 글자 넣기·바꾸기', () => {
  it('커서 자리에 넣고, 같은 구간을 다시 바꾼다', () => {
    const first = insertOrReplaceReference('=SUM()', 5, null, 'B3');
    expect(first).toEqual({ text: '=SUM(B3)', caret: 7, span: { start: 5, end: 7 } });
    const second = insertOrReplaceReference(first.text, first.caret, first.span, 'B3:B7');
    expect(second).toEqual({ text: '=SUM(B3:B7)', caret: 10, span: { start: 5, end: 10 } });
  });

  it.each([
    [range(2, 1), 'Sheet1', 'Sheet1', 'B3'],
    [range(2, 1, 6, 1), 'Sheet1', 'Sheet1', 'B3:B7'],
    [range(0, 0), 'Sheet2', 'Sheet1', 'Sheet2!A1'],
    [range(0, 0, 1, 1), 'My Data', 'Sheet1', "'My Data'!A1:B2"],
    [range(0, 0), '자료', 'Sheet1', '자료!A1'],
    [range(0, 0), "It's", 'Sheet1', "'It''s'!A1"],
  ])('%j (%s 시트, 수식은 %s) → %s', (cells, sheet, formulaSheet, expected) => {
    expect(formatPointReference(cells, sheet, formulaSheet)).toBe(expected);
  });

  it('수식 속 참조 중 보는 시트의 셀·범위만 색 테두리 대상이다', () => {
    expect(referencedRanges('=SUM(B3:B7)+Sheet2!A1+C1+SUM(A:A)', 'Sheet1', 'Sheet1')).toEqual([
      range(2, 1, 6, 1),
      range(0, 2),
    ]);
    expect(referencedRanges('=SUM(B3:B7)+Sheet2!A1', 'Sheet1', 'sheet2')).toEqual([range(0, 0)]);
  });
});

function setup(initialDraft = '=SUM(') {
  const applyChangesTo = vi.fn(() => null);
  const events: PointModeEvent[] = [];
  let viewedSheet = 'Sheet1';
  const hook = renderHook(() => {
    const editor = useCellEditing({
      getCellValue: () => '',
      applyChanges: () => null,
      currentSheet: () => 'Sheet1',
      getCellValueOf: () => '',
      applyChangesTo,
    });
    const point = usePointMode({
      editor,
      viewedSheet,
      rowCount: 20,
      colCount: 10,
      onChange: (event) => events.push(event),
    });
    return { editor, point };
  });
  act(() =>
    hook.result.current.editor.begin({ row: 0, col: 2, draft: initialDraft, mode: 'enter' }),
  );
  return {
    hook,
    events,
    applyChangesTo,
    view: (sheet: string) => {
      viewedSheet = sheet;
      hook.rerender();
    },
  };
}

describe('usePointMode', () => {
  it('클릭하면 참조를 넣고, 끄는 동안 범위로 바뀌며, 확정하면 끝 알림을 보낸다', () => {
    const { hook, events, applyChangesTo } = setup();
    act(() => {
      expect(hook.result.current.point.pointerDown({ row: 2, col: 1 }, false)).toBe(true);
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=SUM(B3');
    act(() => hook.result.current.point.pointerMove({ row: 4, col: 1 }));
    act(() => hook.result.current.point.pointerMove({ row: 6, col: 1 }));
    act(() => hook.result.current.point.pointerUp());
    expect(hook.result.current.editor.editing?.draft).toBe('=SUM(B3:B7');
    expect(hook.result.current.editor.editing?.caret).toBe(10);
    expect(hook.result.current.point.range).toEqual(range(2, 1, 6, 1));

    act(() => hook.result.current.editor.update('=SUM(B3:B7)'));
    act(() => {
      hook.result.current.editor.commit();
    });
    expect(applyChangesTo).toHaveBeenCalledWith('Sheet1', [
      { row: 0, col: 2, value: '=SUM(B3:B7)' },
    ]);
    expect(events.map((e) => [e.type, e.reference])).toEqual([
      ['start', 'B3'],
      ['change', 'B3:B5'],
      ['change', 'B3:B7'],
      ['end', 'B3:B7'],
    ]);
    expect(hook.result.current.point.range).toBeNull();
  });

  it('렌더 전에 마우스 이동이 연달아 와도 같은 참조 구간을 바꾼다', () => {
    const { hook } = setup();
    act(() => {
      hook.result.current.point.pointerDown({ row: 0, col: 0 }, false);
      hook.result.current.point.pointerMove({ row: 1, col: 0 });
      hook.result.current.point.pointerMove({ row: 2, col: 0 });
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=SUM(A1:A3');
  });

  it('Shift+클릭은 직전 참조의 시작 셀부터 범위로 넓힌다', () => {
    const { hook } = setup();
    act(() => {
      hook.result.current.point.pointerDown({ row: 1, col: 1 }, false);
      hook.result.current.point.pointerUp();
    });
    act(() => {
      hook.result.current.point.pointerDown({ row: 3, col: 2 }, true);
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=SUM(B2:C4');
  });

  it('enter 모드 화살표는 편집 중인 셀에서 출발해 참조를 움직이고, Shift는 넓힌다', () => {
    const { hook } = setup('=');
    act(() => {
      expect(hook.result.current.point.arrow(1, 0, false)).toBe(true);
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=C2');
    act(() => {
      hook.result.current.point.arrow(1, 0, true);
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=C2:C3');
  });

  it('edit 모드(F2)의 화살표는 참조를 움직이지 않는다', () => {
    const { hook } = setup();
    act(() => hook.result.current.editor.begin({ row: 0, col: 0, draft: '=', mode: 'edit' }));
    act(() => {
      expect(hook.result.current.point.arrow(1, 0, false)).toBe(false);
    });
  });

  it('넣을 수 없는 자리, 수식이 아닌 편집, 한글 조합 중에는 켜지지 않는다', () => {
    const { hook } = setup('=SUM(A1)');
    act(() => {
      expect(hook.result.current.point.pointerDown({ row: 2, col: 2 }, false)).toBe(false);
    });
    act(() => hook.result.current.editor.begin({ row: 0, col: 0, draft: '합계', mode: 'enter' }));
    act(() => {
      expect(hook.result.current.point.pointerDown({ row: 2, col: 2 }, false)).toBe(false);
    });
    act(() => hook.result.current.editor.begin({ row: 0, col: 0, draft: '=', mode: 'enter' }));
    act(() => hook.result.current.editor.setComposing(true));
    act(() => {
      expect(hook.result.current.point.pointerDown({ row: 2, col: 2 }, false)).toBe(false);
      expect(hook.result.current.point.arrow(1, 0, false)).toBe(false);
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=');
    act(() => hook.result.current.editor.setComposing(false));
    act(() => {
      expect(hook.result.current.point.pointerDown({ row: 2, col: 2 }, false)).toBe(true);
    });
  });

  it('참조를 넣은 뒤 글자를 치면 새 참조는 새 자리에 들어간다', () => {
    const { hook } = setup();
    act(() => {
      hook.result.current.point.pointerDown({ row: 0, col: 0 }, false);
      hook.result.current.point.pointerUp();
    });
    act(() => hook.result.current.editor.update('=SUM(A1,', 8));
    act(() => {
      hook.result.current.point.pointerDown({ row: 1, col: 1 }, false);
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=SUM(A1,B2');
  });

  it('다른 시트 탭: 시트 이름을 붙이고, 그 시트에서 고른 셀은 접두를 유지한 채 바꾼다. 확정은 처음 시트에 한다', () => {
    const { hook, view, applyChangesTo } = setup();
    view('Sheet2');
    act(() => {
      expect(hook.result.current.point.pointSheet('Sheet2', { row: 0, col: 2 })).toBe(true);
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=SUM(Sheet2!C1');
    act(() => {
      hook.result.current.point.pointerDown({ row: 0, col: 0 }, false);
      hook.result.current.point.pointerUp();
    });
    expect(hook.result.current.editor.editing?.draft).toBe('=SUM(Sheet2!A1');
    expect(hook.result.current.point.range).toEqual(range(0, 0));
    act(() => {
      hook.result.current.editor.commit();
    });
    expect(applyChangesTo).toHaveBeenCalledWith('Sheet1', [
      { row: 0, col: 2, value: '=SUM(Sheet2!A1' },
    ]);
  });
});

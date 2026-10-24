import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCellEditing } from '@/components/spreadsheet/hooks/useCellEditing';

function setup(applyResult: string | null = null) {
  const values = new Map<string, string>([['0:0', '기존']]);
  const applyChanges = vi.fn(() => applyResult);
  const hook = renderHook(() =>
    useCellEditing({
      getCellValue: (row, col) => values.get(`${row}:${col}`) ?? '',
      applyChanges,
    }),
  );
  return { hook, applyChanges };
}

describe('useCellEditing', () => {
  it('확정은 한 번만 반영한다 (blur와 클릭이 겹쳐도)', () => {
    const { hook, applyChanges } = setup();
    act(() => hook.result.current.begin({ row: 1, col: 0, draft: '=1+1', mode: 'edit' }));
    let first = false;
    let second = false;
    act(() => {
      first = hook.result.current.commit();
      second = hook.result.current.commit();
    });
    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(applyChanges).toHaveBeenCalledTimes(1);
    expect(applyChanges).toHaveBeenCalledWith([{ row: 1, col: 0, value: '=1+1' }]);
    expect(hook.result.current.editing).toBeNull();
  });

  it('원문과 같으면 반영하지 않는다', () => {
    const { hook, applyChanges } = setup();
    act(() => hook.result.current.begin({ row: 0, col: 0, draft: '기존', mode: 'edit' }));
    act(() => {
      hook.result.current.commit();
    });
    expect(applyChanges).not.toHaveBeenCalled();
  });

  it('거부되면 편집을 유지하고 이유를 담는다. 다시 입력하면 이유가 지워진다', () => {
    const { hook } = setup('수식은 1000자까지 입력할 수 있습니다.');
    act(() => hook.result.current.begin({ row: 2, col: 2, draft: '=1', mode: 'enter' }));
    let closed = true;
    act(() => {
      closed = hook.result.current.commit();
    });
    expect(closed).toBe(false);
    expect(hook.result.current.editing?.draft).toBe('=1');
    expect(hook.result.current.rejection).toContain('1000자');
    act(() => hook.result.current.update('=2'));
    expect(hook.result.current.rejection).toBeNull();
  });

  it('update는 편집 중일 때만, cancel은 반영 없이 닫는다', () => {
    const { hook, applyChanges } = setup();
    act(() => hook.result.current.update('무시'));
    expect(hook.result.current.editing).toBeNull();
    act(() => hook.result.current.begin({ row: 0, col: 1, draft: '', mode: 'enter' }));
    act(() => hook.result.current.update('가'));
    expect(hook.result.current.editing?.draft).toBe('가');
    act(() => hook.result.current.cancel());
    expect(hook.result.current.editing).toBeNull();
    expect(applyChanges).not.toHaveBeenCalled();
  });
});

describe('useCellEditing 포인트 모드 지원 (CARD-02E)', () => {
  it('조합 중에 확정·취소되면 조합 표시를 끈다(Chromium은 이때 compositionend를 보내지 않는다)', () => {
    const { hook } = setup();
    act(() => hook.result.current.begin({ row: 0, col: 1, draft: '=ㅎ', mode: 'enter' }));
    act(() => hook.result.current.setComposing(true));
    expect(hook.result.current.isComposing()).toBe(true);
    act(() => {
      hook.result.current.commit();
    });
    expect(hook.result.current.isComposing()).toBe(false);
    act(() => hook.result.current.begin({ row: 0, col: 1, draft: '=', mode: 'enter' }));
    act(() => hook.result.current.setComposing(true));
    act(() => hook.result.current.cancel());
    expect(hook.result.current.isComposing()).toBe(false);
  });

  it('편집 시트가 있으면 그 시트에 반영하고, 커서 위치 요청을 초안과 함께 둔다', () => {
    const applyChangesTo = vi.fn(() => null);
    const hook = renderHook(() =>
      useCellEditing({
        getCellValue: () => '',
        applyChanges: () => '쓰면 안 됨',
        currentSheet: () => 'Data',
        getCellValueOf: () => '',
        applyChangesTo,
      }),
    );
    act(() => hook.result.current.begin({ row: 2, col: 0, draft: '=', mode: 'enter' }));
    expect(hook.result.current.editing?.sheet).toBe('Data');
    expect(hook.result.current.getCaret()).toBe(1);
    act(() => hook.result.current.update('=A1', 3));
    expect(hook.result.current.editing?.caret).toBe(3);
    act(() => hook.result.current.update('=A1+'));
    expect(hook.result.current.editing?.caret).toBeUndefined();
    act(() => {
      expect(hook.result.current.commit()).toBe(true);
    });
    expect(applyChangesTo).toHaveBeenCalledWith('Data', [{ row: 2, col: 0, value: '=A1+' }]);
  });
});

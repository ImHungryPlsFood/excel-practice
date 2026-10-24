import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';

const DATA: readonly (readonly string[])[] = [
  ['3', '=A1*2'],
  ['합계', '=SUM(B1:B1)'],
];

async function setup() {
  const hook = renderHook(() => useWorkbook(DATA));
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  return hook;
}

describe('useWorkbook: 원문과 계산 결과를 따로 보관한다 (MASTER_PROMPT §8.2)', () => {
  it('준비 중에는 loading이고 빈 결과를 돌려준다', () => {
    const hook = renderHook(() => useWorkbook(DATA));
    expect(hook.result.current.status).toBe('loading');
    expect(hook.result.current.getResult(0, 1).displayValue).toBe('');
    expect(hook.result.current.applyChanges([{ row: 0, col: 0, value: '1' }])).toContain(
      '준비하는 중',
    );
  });

  it('원문은 입력 그대로, 결과는 계산값이다', async () => {
    const hook = await setup();
    expect(hook.result.current.getInput(0, 1)).toBe('=A1*2');
    expect(hook.result.current.getResult(0, 1).value).toBe(6);
    act(() => {
      hook.result.current.applyChanges([{ row: 2, col: 0, value: '=1E+3' }]);
    });
    expect(hook.result.current.getInput(2, 0)).toBe('=1E+3');
    expect(hook.result.current.getResult(2, 0).value).toBe(1000);
  });

  it('원본 셀을 바꾸면 의존 셀이 연쇄로 다시 계산된다', async () => {
    const hook = await setup();
    act(() => {
      hook.result.current.applyChanges([{ row: 0, col: 0, value: '10' }]);
    });
    expect(hook.result.current.getResult(0, 1).value).toBe(20);
    expect(hook.result.current.getResult(1, 1).value).toBe(20);
  });

  it('빈 문자열은 셀을 지운다', async () => {
    const hook = await setup();
    act(() => {
      hook.result.current.applyChanges([{ row: 0, col: 0, value: '' }]);
    });
    expect(hook.result.current.getInput(0, 0)).toBe('');
    expect(hook.result.current.getResult(0, 1).value).toBe(0);
  });

  it('엔진이 거부한 변경은 반영하지 않고 이유를 돌려준다. 앞의 변경은 반영된다', async () => {
    const hook = await setup();
    let refusal: string | null = null;
    act(() => {
      refusal = hook.result.current.applyChanges([
        { row: 3, col: 0, value: '7' },
        { row: 3, col: 1, value: `=${'1+'.repeat(600)}1` },
      ]);
    });
    expect(refusal).toContain('1000자');
    expect(hook.result.current.getInput(3, 0)).toBe('7');
    expect(hook.result.current.getInput(3, 1)).toBe('');
  });

  it('한 이벤트에서 여러 번 반영해도 원문이 누락되지 않는다', async () => {
    const hook = await setup();
    act(() => {
      hook.result.current.applyChanges([{ row: 4, col: 0, value: '가' }]);
      hook.result.current.applyChanges([{ row: 4, col: 1, value: '나' }]);
    });
    expect(hook.result.current.getInput(4, 0)).toBe('가');
    expect(hook.result.current.getInput(4, 1)).toBe('나');
  });

  it('reset은 처음 데이터로 되돌리고, 실행 취소하면 직전 작업이 돌아온다 (MASTER_PROMPT §9.2)', async () => {
    const hook = await setup();
    act(() => {
      hook.result.current.applyChanges([{ row: 0, col: 0, value: '100' }]);
    });
    act(() => hook.result.current.addSheet());
    act(() => hook.result.current.reset());
    expect(hook.result.current.getInput(0, 0)).toBe('3');
    expect(hook.result.current.getResult(0, 1).value).toBe(6);
    expect(hook.result.current.sheets).toEqual(['Sheet1']);
    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.sheets).toEqual(['Sheet1', 'Sheet2']);
    act(() => hook.result.current.setActiveSheet('Sheet1'));
    expect(hook.result.current.getInput(0, 0)).toBe('100');
  });

  it('오류 결과에는 코드와 한국어 안내가 있다', async () => {
    const hook = await setup();
    act(() => {
      hook.result.current.applyChanges([{ row: 5, col: 0, value: '=1/0' }]);
    });
    const { error } = hook.result.current.getResult(5, 0);
    expect(error?.code).toBe('#DIV/0!');
    expect(error?.message).toContain('0으로 나눌 수 없습니다');
  });
});

describe('useWorkbook: 여러 시트와 실행 취소 (CARD-02D)', () => {
  it('셀 편집은 실행 취소·다시 실행된다', async () => {
    const hook = await setup();
    expect(hook.result.current.canUndo).toBe(false);
    act(() => {
      hook.result.current.applyChanges([{ row: 0, col: 0, value: '10' }]);
    });
    expect(hook.result.current.canUndo).toBe(true);
    expect(hook.result.current.undoLabel).toBe('A1 입력');
    act(() => {
      expect(hook.result.current.undo()).toBe(true);
    });
    expect(hook.result.current.getInput(0, 0)).toBe('3');
    expect(hook.result.current.getResult(0, 1).value).toBe(6);
    expect(hook.result.current.canRedo).toBe(true);
    act(() => {
      expect(hook.result.current.redo()).toBe(true);
    });
    expect(hook.result.current.getResult(0, 1).value).toBe(20);
  });

  it('셀 읽기·쓰기는 보고 있는 시트 기준이다', async () => {
    const hook = await setup();
    act(() => {
      expect(hook.result.current.addSheet()).toBeNull();
    });
    expect(hook.result.current.activeSheet).toBe('Sheet2');
    expect(hook.result.current.getInput(0, 0)).toBe('');
    act(() => {
      hook.result.current.applyChanges([{ row: 0, col: 0, value: '=Sheet1!A1*10' }]);
    });
    expect(hook.result.current.getResult(0, 0).value).toBe(30);
    act(() => hook.result.current.setActiveSheet('Sheet1'));
    expect(hook.result.current.getInput(0, 0)).toBe('3');
  });

  it('시트 이름 변경·삭제가 실행 취소된다', async () => {
    const hook = await setup();
    act(() => {
      hook.result.current.addSheet();
    });
    act(() => {
      expect(hook.result.current.renameSheet('Sheet2', '자료')).toBeNull();
    });
    expect(hook.result.current.sheets).toEqual(['Sheet1', '자료']);
    act(() => {
      expect(hook.result.current.deleteSheet('자료')).toBeNull();
    });
    expect(hook.result.current.sheets).toEqual(['Sheet1']);
    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.sheets).toEqual(['Sheet1', '자료']);
    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.sheets).toEqual(['Sheet1', 'Sheet2']);
  });

  it('여러 시트 스냅샷으로도 시작할 수 있다', async () => {
    const source = {
      sheets: [
        { name: '입력', cells: { A1: '4' } },
        { name: '계산', cells: { A1: '=입력!A1^2' } },
      ],
      activeSheet: '계산',
    };
    const hook = renderHook(() => useWorkbook(source));
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.sheets).toEqual(['입력', '계산']);
    expect(hook.result.current.getResult(0, 0).value).toBe(16);
  });
});

describe('useWorkbook.onUndone: 실행 취소가 실제로 실행될 때만 알린다 (CARD-03D)', () => {
  it('되돌릴 것이 없으면 알리지 않고, 되돌리면 한 번 알리며, 구독 해제 뒤에는 알리지 않는다', async () => {
    const hook = await setup();
    const calls: number[] = [];
    let unsubscribe: () => void = () => undefined;
    act(() => {
      unsubscribe = hook.result.current.onUndone(() => calls.push(1));
    });

    act(() => {
      expect(hook.result.current.undo()).toBe(false);
    });
    expect(calls).toHaveLength(0);

    act(() => {
      hook.result.current.applyChanges([{ row: 0, col: 0, value: '9' }]);
    });
    act(() => {
      expect(hook.result.current.undo()).toBe(true);
    });
    expect(calls).toHaveLength(1);

    act(() => {
      hook.result.current.applyChanges([{ row: 0, col: 0, value: '8' }]);
      unsubscribe();
    });
    act(() => {
      hook.result.current.undo();
    });
    expect(calls).toHaveLength(1);
  });
});

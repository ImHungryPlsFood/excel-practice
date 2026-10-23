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

  it('reset은 처음 데이터로 되돌린다', async () => {
    const hook = await setup();
    act(() => {
      hook.result.current.applyChanges([{ row: 0, col: 0, value: '100' }]);
    });
    act(() => hook.result.current.reset());
    expect(hook.result.current.status).toBe('loading');
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.getInput(0, 0)).toBe('3');
    expect(hook.result.current.getResult(0, 1).value).toBe(6);
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

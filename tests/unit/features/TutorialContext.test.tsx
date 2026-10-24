import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { TutorialProvider } from '@/features/learning/context/TutorialContext';
import { useTutorial } from '@/features/learning/context/useTutorial';

import { buildSampleTutorial } from '../tutorials/sampleTutorial';

const definition = buildSampleTutorial();
const wrapper = ({ children }: { children: ReactNode }) => (
  <TutorialProvider definition={definition}>{children}</TutorialProvider>
);

describe('TutorialProvider / useTutorial', () => {
  it('시작 전에는 활성 단계가 없고 진행 정보는 전체 단계 수를 가진다', () => {
    const { result } = renderHook(() => useTutorial(), { wrapper });
    expect(result.current.step).toBeNull();
    expect(result.current.progress).toEqual({ index: null, total: 3, completed: 0 });
  });

  it('START 후 맞는 조작을 dispatch 하면 다음 단계로 간다', () => {
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.dispatch({ type: 'START' }));
    expect(result.current.step?.id).toBe('select-b2');
    act(() =>
      result.current.dispatch({
        type: 'ACTION',
        action: { type: 'SELECT_CELL', sheetName: 'Sheet1', cell: 'B2' },
      }),
    );
    expect(result.current.step?.id).toBe('type-sum');
    expect(result.current.progress).toEqual({ index: 1, total: 3, completed: 1 });
  });

  it('NEXT만 보내서는 단계가 넘어가지 않는다', () => {
    const { result } = renderHook(() => useTutorial(), { wrapper });
    act(() => result.current.dispatch({ type: 'START' }));
    act(() => result.current.dispatch({ type: 'NEXT' }));
    expect(result.current.step?.id).toBe('select-b2');
  });

  it('Provider 밖에서 쓰면 오류를 던진다', () => {
    function Probe() {
      useTutorial();
      return <p>ok</p>;
    }
    const spy = () => render(<Probe />);
    expect(spy).toThrow('TutorialProvider');
    expect(screen.queryByText('ok')).toBeNull();
  });
});

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useImeInput } from '@/components/spreadsheet/hooks/useImeInput';

const keyEvent = (isComposing: boolean, keyCode: number) => ({
  nativeEvent: { isComposing, keyCode },
});
const ENTER = 13;
const IME_PROCESS = 229;

describe('useImeInput', () => {
  it('조합 중이 아닌 일반 Enter는 IME 키로 보지 않는다 (셀 확정 가능)', () => {
    const { result } = renderHook(() => useImeInput());
    expect(result.current.isImeKeyEvent(keyEvent(false, ENTER))).toBe(false);
  });

  it('compositionstart~compositionend 사이의 키는 IME 키다', () => {
    const { result } = renderHook(() => useImeInput());

    act(() => result.current.handleCompositionStart());
    expect(result.current.isComposing()).toBe(true);
    // 일부 브라우저는 조합 중에도 isComposing을 false로 보낼 수 있어 직접 추적한 상태로도 막는다.
    expect(result.current.isImeKeyEvent(keyEvent(false, ENTER))).toBe(true);

    act(() => result.current.handleCompositionEnd());
    expect(result.current.isComposing()).toBe(false);
    expect(result.current.isImeKeyEvent(keyEvent(false, ENTER))).toBe(false);
  });

  it('Chrome 순서: 조합을 끝내는 Enter keydown은 isComposing이 참이라 무시한다', () => {
    const { result } = renderHook(() => useImeInput());
    expect(result.current.isImeKeyEvent(keyEvent(true, ENTER))).toBe(true);
  });

  it('Safari 순서: compositionend 뒤에 오는 keyCode 229 Enter도 무시한다', () => {
    const { result } = renderHook(() => useImeInput());
    act(() => result.current.handleCompositionStart());
    act(() => result.current.handleCompositionEnd());
    expect(result.current.isImeKeyEvent(keyEvent(false, IME_PROCESS))).toBe(true);
    // 그다음 실제 Enter는 셀 확정으로 처리돼야 한다.
    expect(result.current.isImeKeyEvent(keyEvent(false, ENTER))).toBe(false);
  });

  it('조합이 시작되면 onCompositionStart 콜백(편집 시작)을 부른다', () => {
    const onCompositionStart = vi.fn();
    const { result } = renderHook(() => useImeInput({ onCompositionStart }));
    act(() => result.current.handleCompositionStart());
    expect(onCompositionStart).toHaveBeenCalledTimes(1);
  });
});

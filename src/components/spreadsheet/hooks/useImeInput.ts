import { useCallback, useRef } from 'react';

/*
 * 한글 등 IME 조합 입력 처리 (TEST_STRATEGY Q-05).
 *
 * 조합 중 Enter는 "글자 확정"이지 "셀 확정"이 아니다. 이를 구분하지 않으면 마지막 글자가
 * 사라지거나 두 번 입력된다. 브라우저마다 신호가 다르므로 세 가지를 모두 본다.
 * - Chrome/Edge/Firefox: 조합을 끝내는 keydown에 isComposing === true
 * - Safari: compositionend가 keydown보다 먼저 와서 isComposing은 false지만 keyCode가 229
 * - 공통: compositionstart~compositionend 사이를 직접 추적
 */

/** React 합성 이벤트와 테스트용 평범한 객체를 모두 받기 위한 최소 형태 */
export interface ImeKeyEventLike {
  nativeEvent: { isComposing: boolean; keyCode: number };
}

const IME_PROCESS_KEY_CODE = 229;

export interface UseImeInputOptions {
  /** 조합이 시작될 때 호출된다. 그리드는 여기서 편집 모드로 들어간다. */
  onCompositionStart?: () => void;
}

export function useImeInput({ onCompositionStart }: UseImeInputOptions = {}) {
  const composingRef = useRef(false);

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
    onCompositionStart?.();
  }, [onCompositionStart]);

  const handleCompositionEnd = useCallback(() => {
    composingRef.current = false;
  }, []);

  /** true면 이 keydown은 IME가 처리 중이므로 이동·확정·취소 단축키로 해석하면 안 된다. */
  const isImeKeyEvent = useCallback(
    (event: ImeKeyEventLike): boolean =>
      composingRef.current ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === IME_PROCESS_KEY_CODE,
    [],
  );

  const isComposing = useCallback(() => composingRef.current, []);

  /**
   * 조합 표시를 끈다. 조합 중에 셀을 클릭해 편집이 확정되면 React가 입력 상자 값을 비우는데,
   * Chromium은 이때 compositionend 없이 조합을 끝낸다(CARD-02E Playwright 실측). 표시가 켜진 채 남으면
   * 이후 Enter·화살표가 모두 IME 몫으로 무시되므로, 편집이 끝나면 호출한다.
   */
  const resetComposition = useCallback(() => {
    composingRef.current = false;
  }, []);

  return {
    handleCompositionStart,
    handleCompositionEnd,
    isImeKeyEvent,
    isComposing,
    resetComposition,
  };
}

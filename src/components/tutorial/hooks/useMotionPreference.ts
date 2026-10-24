import { useSyncExternalStore } from 'react';

/*
 * 모션 감소 여부 (CARD-03C, MASTER_PROMPT §7.3 prefers-reduced-motion).
 * 운영체제 설정(prefers-reduced-motion: reduce)이나 앱 설정(<html data-motion="reduce">) 중 하나라도 켜져 있으면 true다.
 * 앱 설정 화면과 저장은 CARD-03D(useReducedMotion·설정 UI)가 이 속성을 쓰는 방식으로 연결한다.
 * CSS 쪽은 tokens.css가 같은 두 조건에서 --motion-duration-* 를 0으로 바꾼다.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

function mediaQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const media = mediaQuery();
  media?.addEventListener('change', onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-motion'],
  });
  return () => {
    media?.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

export function isMotionReduced(): boolean {
  return document.documentElement.dataset.motion === 'reduce' || (mediaQuery()?.matches ?? false);
}

export function useMotionPreference(): { reduced: boolean } {
  const reduced = useSyncExternalStore(subscribe, isMotionReduced, () => false);
  return { reduced };
}

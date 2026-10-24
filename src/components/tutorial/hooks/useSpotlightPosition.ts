import { useLayoutEffect, useRef, useState } from 'react';

import type { ViewportRect } from '@/components/spreadsheet/types';

/*
 * Spotlight 위치 실시간 추적 (CARD-03C, R-07.19, P-04).
 * 위치는 DOM에 그려진 셀이 아니라 measure(셀 좌표 API·요소 경계)로 계산하므로 가상 스크롤로 DOM에서 빠진 셀도 따라간다.
 * 다시 재는 때:
 *   - 아무 요소의 스크롤(그리드 내부 스크롤 포함, capture 단계로 받는다)
 *   - 창 크기 변경, 관찰 대상 요소(그리드·강조 UI)의 크기 변경(ResizeObserver)
 *   - 포인터·키 입력이 끝났을 때(열 너비 조절·시트 전환처럼 스크롤 없이 배치가 바뀌는 조작)
 *   - key(단계·강조 대상)가 바뀔 때
 * 같은 프레임 안의 여러 알림은 requestAnimationFrame 한 번으로 묶고, 값이 같으면 다시 그리지 않는다.
 */

export interface SpotlightMeasure {
  /** 강조 사각형(보이는 영역으로 잘린 값). 대상이 지금 화면에 보이지 않으면 null */
  target: ViewportRect | null;
  /** 대상이 없거나 보이지 않을 때 말풍선을 띄울 기준 영역 */
  anchor: ViewportRect | null;
  /** 강조할 대상이 있는데 화면 밖(스크롤 영역 밖)에 있다 */
  offscreen: boolean;
}

export interface SpotlightGeometry extends SpotlightMeasure {
  viewport: { width: number; height: number };
}

const EMPTY: SpotlightGeometry = {
  target: null,
  anchor: null,
  offscreen: false,
  viewport: { width: 0, height: 0 },
};

const sameRect = (a: ViewportRect | null, b: ViewportRect | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

const sameGeometry = (a: SpotlightGeometry, b: SpotlightGeometry) =>
  sameRect(a.target, b.target) &&
  sameRect(a.anchor, b.anchor) &&
  a.offscreen === b.offscreen &&
  a.viewport.width === b.viewport.width &&
  a.viewport.height === b.viewport.height;

/**
 * @param measure 지금 화면 기준 강조 위치를 계산한다. 렌더마다 새 함수여도 된다(최신 값을 ref로 쓴다).
 * @param key 강조 대상이 바뀌면 달라지는 값. 바뀌면 즉시 다시 재고 관찰 대상도 다시 고른다.
 * @param observe 크기 변화를 지켜볼 요소들
 */
export function useSpotlightPosition(
  measure: () => SpotlightMeasure,
  key: string,
  observe: () => readonly (Element | null)[],
): SpotlightGeometry {
  const [geometry, setGeometry] = useState<SpotlightGeometry>(EMPTY);
  const latestRef = useRef({ measure, observe });
  useLayoutEffect(() => {
    latestRef.current = { measure, observe };
  });

  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const next: SpotlightGeometry = {
        ...latestRef.current.measure(),
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
      setGeometry((previous) => (sameGeometry(previous, next) ? previous : next));
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    schedule();
    const listen = { capture: true, passive: true } as const;
    window.addEventListener('scroll', schedule, listen);
    window.addEventListener('resize', schedule, listen);
    window.addEventListener('pointerup', schedule, listen);
    window.addEventListener('keyup', schedule, listen);
    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    for (const element of latestRef.current.observe()) {
      if (element !== null) resizeObserver?.observe(element);
    }
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, listen);
      window.removeEventListener('resize', schedule, listen);
      window.removeEventListener('pointerup', schedule, listen);
      window.removeEventListener('keyup', schedule, listen);
      resizeObserver?.disconnect();
    };
  }, [key]);

  return geometry;
}

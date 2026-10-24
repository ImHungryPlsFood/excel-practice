import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import type { ViewportRect } from '@/components/spreadsheet/types';

import { computeCalloutPlacement } from './calloutPlacement';

/*
 * 대상에 연결된 설명 말풍선 (CARD-03C, R-07.17, R-07.18, R-07.20, R-07.22).
 * 위치는 computeCalloutPlacement가 정한다(가장자리에서 반대쪽으로 뒤집고, 그래도 넘치면 화면 안으로 끌어온다).
 * 화살표는 대상 중심을 가리킨다. 말풍선 크기는 ResizeObserver로 재서 내용이 바뀌어도 다시 배치한다.
 *
 * 비모달이다(aria-modal=false, 포커스를 가두지 않음). 사용자는 그리드에서 실제로 조작해야 하기 때문이다.
 * Esc(말풍선 안): onEscape — 학습 화면은 그리드로 포커스만 돌려준다. 단계를 넘기거나 건너뛰지 않는다.
 * 위치 전환은 transform만 쓰며 모션 감소 상태에서는 바로 옮긴다. 처음 나타날 때는 미끄러지지 않는다.
 */

interface CalloutTooltipProps {
  target: ViewportRect | null;
  /** 대상이 없을 때 기준 영역 */
  anchor: ViewportRect | null;
  viewport: { width: number; height: number };
  /** 제목 요소 id (aria-labelledby) */
  labelledBy: string;
  reducedMotion: boolean;
  onEscape: () => void;
  children: ReactNode;
}

const ARROW_SIZE = 10;

export const CalloutTooltip = forwardRef<HTMLDivElement, CalloutTooltipProps>(
  function CalloutTooltip(
    { target, anchor, viewport, labelledBy, reducedMotion, onEscape, children },
    forwardedRef,
  ) {
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);

    useLayoutEffect(() => {
      const element = boxRef.current;
      if (element === null) return;
      const read = () => {
        const next = { width: element.offsetWidth, height: element.offsetHeight };
        setSize((previous) =>
          previous !== null && previous.width === next.width && previous.height === next.height
            ? previous
            : next,
        );
      };
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(read) : null;
      observer?.observe(element);
      const frame = window.requestAnimationFrame(read);
      return () => {
        window.cancelAnimationFrame(frame);
        observer?.disconnect();
      };
    }, []);

    const placement = computeCalloutPlacement({
      target,
      anchor,
      size: size ?? { width: 0, height: 0 },
      viewport,
      gap: ARROW_SIZE + 4,
    });

    // 처음 자리 잡을 때(크기를 재기 전→후)는 미끄러지지 않게 전환을 끈다.
    const [placed, setPlaced] = useState(false);
    useLayoutEffect(() => {
      if (size === null || placed) return;
      const frame = window.requestAnimationFrame(() => setPlaced(true));
      return () => window.cancelAnimationFrame(frame);
    }, [size, placed]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      onEscape();
    };

    const setRefs = (element: HTMLDivElement | null) => {
      boxRef.current = element;
      if (typeof forwardedRef === 'function') forwardedRef(element);
      else if (forwardedRef !== null) forwardedRef.current = element;
    };

    const arrow =
      placement.arrowOffset === null ? null : arrowStyle(placement.side, placement.arrowOffset);

    return (
      <div
        ref={setRefs}
        role="dialog"
        aria-modal="false"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        data-testid="tutorial-callout"
        data-side={placement.side}
        onKeyDown={handleKeyDown}
        className="fixed top-0 left-0 z-50 w-[min(22rem,calc(100vw-16px))] rounded-lg border border-line bg-surface p-4 text-fg shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-brand"
        style={{
          transform: `translate(${Math.round(placement.left)}px, ${Math.round(placement.top)}px)`,
          opacity: size === null ? 0 : 1,
          transitionProperty: placed && !reducedMotion ? 'transform, opacity' : 'none',
          transitionDuration: 'var(--motion-duration-fast)',
          transitionTimingFunction: 'var(--motion-ease-out)',
        }}
      >
        {arrow !== null && (
          <span
            aria-hidden="true"
            data-testid="tutorial-callout-arrow"
            className="absolute h-2.5 w-2.5 rotate-45 border-line bg-surface"
            style={arrow}
          />
        )}
        {children}
      </div>
    );
  },
);

/** 대상 쪽 가장자리에 화살표를 놓는다. 말풍선이 대상 아래(bottom)면 화살표는 위 가장자리다. */
function arrowStyle(side: string, offset: number) {
  const half = ARROW_SIZE / 2;
  switch (side) {
    case 'bottom':
      return { top: -half - 1, left: offset - half, borderTopWidth: 1, borderLeftWidth: 1 };
    case 'top':
      return { bottom: -half - 1, left: offset - half, borderBottomWidth: 1, borderRightWidth: 1 };
    case 'right':
      return { left: -half - 1, top: offset - half, borderBottomWidth: 1, borderLeftWidth: 1 };
    default:
      return { right: -half - 1, top: offset - half, borderTopWidth: 1, borderRightWidth: 1 };
  }
}

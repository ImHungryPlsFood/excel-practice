import { useId } from 'react';

import type { ViewportRect } from '@/components/spreadsheet/types';

/*
 * 비침해적 Spotlight 오버레이 (CARD-03C, R-07.14, R-07.15, R-07.16).
 * 화면 전체를 SVG로 부드럽게 어둡게 하고, mask로 강조 대상 자리만 뚫는다.
 * 대상 위에는 아무것도 덮지 않으므로 대상은 원래 모습 그대로 보이고, 둘레에 두 겹 테두리(밝은 바깥 링 + 브랜드색)를 그린다.
 *
 * 입력 설계 (MASTER_PROMPT §7.2 "오버레이가 실제 입력을 막아서는 안 된다"):
 * 오버레이 전체가 pointer-events: none 이고 포커스를 받지 않는다(aria-hidden). 대상은 물론, 범위 끌기처럼
 * 대상 밖 셀을 써야 하는 조작도 그대로 그리드에 닿는다. 단계에서 허용하지 않는 입력을 막는 일은
 * 오버레이가 아니라 TutorialStepGuards의 inputGuard가 실제 조작 단위로 한다(CARD-03B).
 */

/** 강조 사각형을 대상보다 이만큼 넓혀 테두리가 셀 내용을 가리지 않게 한다 */
export const SPOTLIGHT_PADDING = 2;

interface SpotlightOverlayProps {
  /** 강조할 화면 영역(보이는 부분). null이면 구멍 없이 어둡게만 한다. */
  target: ViewportRect | null;
  /** 강조 대상이 바뀔 때 바뀌는 값. 테두리가 새로 페이드인한다(구멍 좌표는 애니메이션하지 않는다, P-03). */
  targetKey?: string;
}

export function SpotlightOverlay({ target, targetKey }: SpotlightOverlayProps) {
  const maskId = `spotlight-mask-${useId().replace(/:/g, '')}`;
  const hole =
    target === null
      ? null
      : {
          x: target.left - SPOTLIGHT_PADDING,
          y: target.top - SPOTLIGHT_PADDING,
          width: target.width + SPOTLIGHT_PADDING * 2,
          height: target.height + SPOTLIGHT_PADDING * 2,
        };

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-testid="spotlight-overlay"
      className="cc-fade-in pointer-events-none fixed inset-0 z-40 h-full w-full"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {hole !== null && <rect {...hole} rx="3" fill="black" />}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="var(--cc-overlay-dim)"
        mask={`url(#${maskId})`}
        data-testid="spotlight-dim"
      />
      {hole !== null && (
        <g key={targetKey} className="cc-fade-in">
          <rect {...hole} rx="3" fill="none" stroke="white" strokeWidth="5" opacity="0.9" />
          <rect
            {...hole}
            rx="3"
            fill="none"
            stroke="var(--cc-color-brand)"
            strokeWidth="2"
            data-testid="spotlight-ring"
          />
        </g>
      )}
    </svg>
  );
}

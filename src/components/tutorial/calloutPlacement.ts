import type { ViewportRect } from '@/components/spreadsheet/types';

/*
 * 말풍선 위치 계산 (CARD-03C, R-07.17, R-07.18, P-04).
 * 대상 아래 → 위 → 오른쪽 → 왼쪽 순으로 말풍선이 화면 안에 다 들어가는 자리를 고른다(Flip).
 * 어느 쪽에도 다 들어가지 않으면 가장 넓은 쪽에 두고 화면 안으로 끌어온다. 말풍선은 어떤 경우에도 화면 밖으로 잘리지 않는다.
 * DOM을 읽지 않는 순수 함수라 단위 테스트로 모든 경계를 확인한다.
 */

export type CalloutSide = 'bottom' | 'top' | 'right' | 'left';

export interface CalloutPlacement {
  /** 대상이 없으면 'floating' (화살표 없음) */
  side: CalloutSide | 'floating';
  top: number;
  left: number;
  /** 말풍선 가장자리를 따라 잰 화살표 중심 위치(px). 화살표가 없으면 null */
  arrowOffset: number | null;
}

export interface CalloutPlacementInput {
  /** 강조 대상의 보이는 부분. 없으면 anchor 영역 안 아래쪽 가운데에 띄운다. */
  target: ViewportRect | null;
  size: { width: number; height: number };
  viewport: { width: number; height: number };
  /** 대상이 없을 때 기준 영역(예: 셀 표시 영역). 없으면 화면 전체 */
  anchor?: ViewportRect | null;
  /** 대상과 말풍선 사이 간격 (화살표 자리) */
  gap?: number;
  /** 화면 가장자리 여백 */
  margin?: number;
}

const SIDES: readonly CalloutSide[] = ['bottom', 'top', 'right', 'left'];
/** 화살표가 말풍선 모서리 둥근 부분에 걸리지 않게 둘 최소 거리 */
const ARROW_INSET = 14;

const clamp = (value: number, min: number, max: number) =>
  max < min ? min : Math.min(Math.max(value, min), max);

export function computeCalloutPlacement({
  target,
  size,
  viewport,
  anchor = null,
  gap = 12,
  margin = 8,
}: CalloutPlacementInput): CalloutPlacement {
  const maxLeft = viewport.width - size.width - margin;
  const maxTop = viewport.height - size.height - margin;

  if (target === null) {
    const area = anchor ?? { top: 0, left: 0, width: viewport.width, height: viewport.height };
    return {
      side: 'floating',
      left: clamp(area.left + area.width / 2 - size.width / 2, margin, maxLeft),
      top: clamp(area.top + area.height - size.height - margin * 2, margin, maxTop),
      arrowOffset: null,
    };
  }

  const right = target.left + target.width;
  const bottom = target.top + target.height;
  const space: Record<CalloutSide, number> = {
    bottom: viewport.height - margin - (bottom + gap),
    top: target.top - gap - margin,
    right: viewport.width - margin - (right + gap),
    left: target.left - gap - margin,
  };
  const need: Record<CalloutSide, number> = {
    bottom: size.height,
    top: size.height,
    right: size.width,
    left: size.width,
  };
  const side =
    SIDES.find((candidate) => space[candidate] >= need[candidate]) ??
    SIDES.reduce((best, candidate) =>
      space[candidate] - need[candidate] > space[best] - need[best] ? candidate : best,
    );

  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;
  let top: number;
  let left: number;
  if (side === 'bottom' || side === 'top') {
    left = clamp(centerX - size.width / 2, margin, maxLeft);
    top = clamp(side === 'bottom' ? bottom + gap : target.top - gap - size.height, margin, maxTop);
  } else {
    top = clamp(centerY - size.height / 2, margin, maxTop);
    left = clamp(side === 'right' ? right + gap : target.left - gap - size.width, margin, maxLeft);
  }

  const arrowOffset =
    side === 'bottom' || side === 'top'
      ? clamp(centerX - left, ARROW_INSET, size.width - ARROW_INSET)
      : clamp(centerY - top, ARROW_INSET, size.height - ARROW_INSET);
  return { side, top, left, arrowOffset };
}

/** 두 사각형의 겹친 부분. 겹치지 않으면 null */
export function intersectRect(a: ViewportRect, b: ViewportRect): ViewportRect | null {
  const top = Math.max(a.top, b.top);
  const left = Math.max(a.left, b.left);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  const right = Math.min(a.left + a.width, b.left + b.width);
  if (bottom <= top || right <= left) return null;
  return { top, left, width: right - left, height: bottom - top };
}

/** inner가 outer 안에 완전히 들어 있는가 (소수점 반올림 오차 0.5px 허용) */
export function containsRect(outer: ViewportRect, inner: ViewportRect): boolean {
  const e = 0.5;
  return (
    inner.top >= outer.top - e &&
    inner.left >= outer.left - e &&
    inner.top + inner.height <= outer.top + outer.height + e &&
    inner.left + inner.width <= outer.left + outer.width + e
  );
}

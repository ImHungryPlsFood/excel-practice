import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CalloutTooltip } from '@/components/tutorial/CalloutTooltip';
import {
  computeCalloutPlacement,
  containsRect,
  intersectRect,
} from '@/components/tutorial/calloutPlacement';

/*
 * CARD-03C 말풍선 위치(Flip·화면 안 고정)와 말풍선 동작 (R-07.17, R-07.18, R-07.22, P-04).
 */

const VIEWPORT = { width: 1000, height: 800 };
const SIZE = { width: 300, height: 150 };
const GAP = 12;
const MARGIN = 8;

const rect = (left: number, top: number, width = 96, height = 24) => ({ top, left, width, height });

/** 말풍선이 화면 안(여백 포함)에 완전히 들어가는가 */
function insideViewport(
  placement: { top: number; left: number },
  size = SIZE,
  viewport = VIEWPORT,
) {
  return (
    placement.left >= MARGIN &&
    placement.top >= MARGIN &&
    placement.left + size.width <= viewport.width - MARGIN &&
    placement.top + size.height <= viewport.height - MARGIN
  );
}

const place = (target: ReturnType<typeof rect> | null, size = SIZE, viewport = VIEWPORT) =>
  computeCalloutPlacement({ target, size, viewport, gap: GAP, margin: MARGIN });

describe('computeCalloutPlacement', () => {
  it('공간이 있으면 대상 아래 가운데에 두고 화살표가 대상 중심을 가리킨다', () => {
    const target = rect(400, 100);
    const placement = place(target);
    expect(placement.side).toBe('bottom');
    expect(placement.top).toBe(100 + 24 + GAP);
    expect(placement.left).toBe(448 - 150);
    expect(placement.left + (placement.arrowOffset ?? 0)).toBe(448);
  });

  it('아래가 모자라면 위로 뒤집는다', () => {
    const placement = place(rect(400, 700));
    expect(placement.side).toBe('top');
    expect(placement.top + SIZE.height).toBe(700 - GAP);
    expect(insideViewport(placement)).toBe(true);
  });

  it('위아래가 모두 모자라면 오른쪽, 오른쪽도 모자라면 왼쪽으로 뒤집는다', () => {
    const tall = { top: 20, left: 100, width: 96, height: 760 };
    const right = place(tall);
    expect(right.side).toBe('right');
    expect(right.left).toBe(196 + GAP);
    expect(insideViewport(right)).toBe(true);

    const nearRightEdge = { ...tall, left: 800 };
    const left = place(nearRightEdge);
    expect(left.side).toBe('left');
    expect(left.left + SIZE.width).toBe(800 - GAP);
    expect(insideViewport(left)).toBe(true);
  });

  it('왼쪽·오른쪽 가장자리에 붙은 대상이어도 말풍선은 화면 안으로 끌려 들어오고 화살표는 대상 쪽에 남는다', () => {
    const leftEdge = place(rect(0, 100, 40));
    expect(leftEdge.left).toBe(MARGIN);
    expect(insideViewport(leftEdge)).toBe(true);
    expect(leftEdge.arrowOffset).toBe(14);

    const rightEdge = place(rect(960, 100, 40));
    expect(rightEdge.left + SIZE.width).toBe(VIEWPORT.width - MARGIN);
    expect(insideViewport(rightEdge)).toBe(true);
    expect(rightEdge.arrowOffset).toBe(SIZE.width - 14);
  });

  it('네 구석의 대상 모두에서 화면 밖으로 잘리지 않는다', () => {
    for (const target of [rect(0, 0), rect(904, 0), rect(0, 776), rect(904, 776)]) {
      expect(insideViewport(place(target))).toBe(true);
    }
  });

  it('어느 쪽에도 다 들어가지 않으면 가장 넓은 쪽을 고르고 화면 안으로 고정한다', () => {
    const huge = { top: 10, left: 10, width: 980, height: 780 };
    const placement = place(huge);
    expect(insideViewport(placement)).toBe(true);
  });

  it('작은 화면(320×480)에서도 화면 안에 둔다', () => {
    const small = { width: 320, height: 480 };
    const size = { width: 300, height: 200 };
    const placement = place(rect(200, 240), size, small);
    expect(insideViewport(placement, size, small)).toBe(true);
  });

  it('대상이 없으면 기준 영역 아래쪽 가운데에 띄우고 화살표가 없다', () => {
    const anchor = { top: 100, left: 200, width: 600, height: 500 };
    const placement = computeCalloutPlacement({
      target: null,
      anchor,
      size: SIZE,
      viewport: VIEWPORT,
      margin: MARGIN,
    });
    expect(placement.side).toBe('floating');
    expect(placement.arrowOffset).toBeNull();
    expect(placement.left).toBe(500 - 150);
    expect(placement.top + SIZE.height).toBe(600 - MARGIN * 2);
  });
});

describe('intersectRect / containsRect', () => {
  it('겹친 부분을 돌려주고 겹치지 않으면 null', () => {
    expect(intersectRect(rect(0, 0, 100, 100), rect(50, 50, 100, 100))).toEqual(
      rect(50, 50, 50, 50),
    );
    expect(intersectRect(rect(0, 0, 10, 10), rect(20, 20, 10, 10))).toBeNull();
  });

  it('완전히 들어 있는지 판단한다', () => {
    expect(containsRect(rect(0, 0, 100, 100), rect(10, 10, 20, 20))).toBe(true);
    expect(containsRect(rect(0, 0, 100, 100), rect(90, 10, 20, 20))).toBe(false);
  });
});

describe('CalloutTooltip', () => {
  const renderCallout = (onEscape = vi.fn()) => {
    render(
      <CalloutTooltip
        target={rect(400, 100)}
        anchor={null}
        viewport={VIEWPORT}
        labelledBy="title"
        reducedMotion={false}
        onEscape={onEscape}
      >
        <p id="title">B2 선택</p>
        <button type="button">다음</button>
      </CalloutTooltip>,
    );
    return onEscape;
  };

  it('제목으로 이름 붙은 비모달 대화 상자이고 대상 쪽 화살표가 있다', () => {
    renderCallout();
    const dialog = screen.getByRole('dialog', { name: 'B2 선택' });
    expect(dialog).toHaveAttribute('aria-modal', 'false');
    expect(dialog).toHaveAttribute('data-side', 'bottom');
    expect(screen.getByTestId('tutorial-callout-arrow')).toBeInTheDocument();
  });

  it('말풍선 안 Esc는 onEscape만 부르고 기본 동작을 막는다', () => {
    const onEscape = renderCallout();
    const button = screen.getByRole('button', { name: '다음' });
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('한글 조합 중 Esc는 무시한다', () => {
    const onEscape = renderCallout();
    fireEvent.keyDown(screen.getByRole('button', { name: '다음' }), {
      key: 'Escape',
      isComposing: true,
    });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('모션 감소 상태에서는 위치 전환을 끈다', () => {
    render(
      <CalloutTooltip
        target={null}
        anchor={null}
        viewport={VIEWPORT}
        labelledBy="t"
        reducedMotion
        onEscape={vi.fn()}
      >
        <p id="t">안내</p>
      </CalloutTooltip>,
    );
    expect(screen.getByRole('dialog')).toHaveStyle({ transitionProperty: 'none' });
    expect(screen.queryByTestId('tutorial-callout-arrow')).toBeNull();
  });
});

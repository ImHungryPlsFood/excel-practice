import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPOTLIGHT_PADDING, SpotlightOverlay } from '@/components/tutorial/SpotlightOverlay';

/*
 * CARD-03C Spotlight 오버레이 (R-07.14, R-07.15, R-07.16, MASTER_PROMPT §7.2 입력 비차단).
 */

describe('SpotlightOverlay', () => {
  it('입력을 막지 않고 접근성 트리에서 빠진다', () => {
    render(<SpotlightOverlay target={{ top: 50, left: 100, width: 96, height: 24 }} />);
    const overlay = screen.getByTestId('spotlight-overlay');
    expect(overlay).toHaveStyle({ pointerEvents: 'none' });
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('배경을 어둡게 하고 mask로 대상 자리만 뚫으며 같은 자리에 테두리를 그린다', () => {
    const { container } = render(
      <SpotlightOverlay target={{ top: 50, left: 100, width: 96, height: 24 }} />,
    );
    const dim = screen.getByTestId('spotlight-dim');
    const maskId = /^url\(#(.+)\)$/.exec(dim.getAttribute('mask') ?? '')?.[1];
    expect(maskId).toBeDefined();
    const hole = container.querySelector(`mask[id="${maskId}"] rect[fill="black"]`);
    const ring = screen.getByTestId('spotlight-ring');
    const expected = {
      x: String(100 - SPOTLIGHT_PADDING),
      y: String(50 - SPOTLIGHT_PADDING),
      width: String(96 + SPOTLIGHT_PADDING * 2),
      height: String(24 + SPOTLIGHT_PADDING * 2),
    };
    for (const [name, value] of Object.entries(expected)) {
      expect(hole).toHaveAttribute(name, value);
      expect(ring).toHaveAttribute(name, value);
    }
    // 대상 위에 채운 덮개가 없다: 구멍을 덮는 도형은 테두리(fill none)뿐이다.
    expect(ring).toHaveAttribute('fill', 'none');
  });

  it('대상이 없으면(화면 밖) 구멍과 테두리 없이 어둡게만 한다', () => {
    const { container } = render(<SpotlightOverlay target={null} />);
    expect(screen.getByTestId('spotlight-dim')).toBeInTheDocument();
    expect(screen.queryByTestId('spotlight-ring')).toBeNull();
    expect(container.querySelector('mask rect[fill="black"]')).toBeNull();
  });
});

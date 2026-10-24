import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { HintAccordion } from '@/features/learning/components/HintAccordion';
import { earnedPoints, revealedHints } from '@/features/learning/hints';

/*
 * CARD-04C 단계별 힌트 (R-09.27~R-09.32, R-01.09): 요청 전에는 본문이 없고, 한 번에 한 단계씩 순서대로 열린다.
 * 힌트를 열어도 문제가 완료되지 않는 것(R-09.31)은 이 컴포넌트가 완료 상태를 받지도 바꾸지도 않는 구조이고,
 * 실제 시트와 채점기를 쓰는 E2E(problem-grading.spec.ts)에서 확인한다.
 */

const HINTS = ['개념 힌트 본문', '범위 힌트 본문', '골격 힌트 본문', '완전한 풀이 본문'] as const;

/** 부모가 요청된 단계까지만 본문을 넘기는 실제 사용 방식 그대로 */
function Harness() {
  const [count, setCount] = useState(0);
  return (
    <HintAccordion
      total={HINTS.length}
      revealed={revealedHints({ hints: HINTS }, count)}
      onRevealNext={() => setCount((n) => n + 1)}
    />
  );
}

describe('HintAccordion', () => {
  it('요청 전에는 어떤 힌트 본문도 화면에 없다', () => {
    render(<Harness />);
    for (const text of HINTS) expect(screen.queryByText(text)).toBeNull();
    expect(screen.getByRole('button', { name: '힌트 보기' })).toBeTruthy();
    expect(screen.getByRole('status', { name: '힌트 사용' }).textContent).toContain('0/4');
  });

  it('누를 때마다 다음 한 단계만 순서대로 열린다 (R-09.27~30)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '힌트 보기' }));
    expect(screen.getByText(HINTS[0])).toBeTruthy();
    expect(screen.queryByText(HINTS[1])).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /다음 힌트 보기/ }));
    expect(screen.getByText(HINTS[1])).toBeTruthy();
    expect(screen.queryByText(HINTS[2])).toBeNull();
    expect(screen.queryByText(HINTS[3])).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /다음 힌트 보기/ }));
    fireEvent.click(screen.getByRole('button', { name: /다음 힌트 보기/ }));
    expect(screen.getByText(HINTS[3])).toBeTruthy();
    expect(screen.queryByRole('button', { name: /힌트 보기/ })).toBeNull();
    expect(screen.getByRole('status', { name: '힌트 사용' }).textContent).toContain('4/4');
  });

  it('부모가 넘기지 않은 단계는 DOM에 존재할 수 없다', () => {
    const { container } = render(
      <HintAccordion total={4} revealed={[HINTS[0]]} onRevealNext={vi.fn()} />,
    );
    expect(container.textContent).not.toContain(HINTS[1]);
    expect(container.textContent).not.toContain(HINTS[3]);
  });
});

describe('힌트 본문 공개 경로와 점수 (R-09.32)', () => {
  it('revealedHints는 요청한 단계까지만 돌려준다', () => {
    expect(revealedHints({ hints: HINTS }, 0)).toEqual([]);
    expect(revealedHints({ hints: HINTS }, 2)).toEqual([HINTS[0], HINTS[1]]);
    expect(revealedHints({ hints: HINTS }, 99)).toHaveLength(4);
    expect(revealedHints({ hints: HINTS }, -3)).toEqual([]);
  });

  it('감점은 단계당 고정값이고 0점 아래로 내려가지 않는다', () => {
    expect(earnedPoints({ points: 20, hintPenaltyPerStep: 2 }, 0)).toBe(20);
    expect(earnedPoints({ points: 20, hintPenaltyPerStep: 2 }, 4)).toBe(12);
    expect(earnedPoints({ points: 5, hintPenaltyPerStep: 4 }, 4)).toBe(0);
  });
});

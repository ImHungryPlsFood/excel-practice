import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LearningLayout } from '@/features/learning/components/LearningLayout';

describe('LearningLayout (R-04.38~R-04.44)', () => {
  it('상단·왼쪽·중앙·오른쪽·하단 다섯 영역을 그린다', () => {
    render(
      <LearningLayout
        header={<span>단원 3 · 2/5 단계</span>}
        guide={<p>SUM으로 합계를 구합니다.</p>}
        task={<p>B5에 합계를 구하세요.</p>}
        footer={<span>작업 상태</span>}
      >
        <div>시트</div>
      </LearningLayout>,
    );
    expect(screen.getByRole('banner')).toHaveTextContent('단원 3 · 2/5 단계');
    expect(screen.getByRole('complementary', { name: '학습 안내' })).toHaveTextContent('SUM');
    expect(screen.getByRole('main', { name: '작업 공간' })).toHaveTextContent('시트');
    expect(screen.getByRole('complementary', { name: '문제와 힌트' })).toHaveTextContent('B5');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('작업 상태');
  });

  it('내용을 넘기지 않은 영역은 그리지 않는다 (R-04.44)', () => {
    render(
      <LearningLayout>
        <div>시트</div>
      </LearningLayout>,
    );
    expect(screen.getByRole('main', { name: '작업 공간' })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('좁은 화면에서는 작업 공간이 패널보다 먼저 온다', () => {
    render(
      <LearningLayout guide={<p>안내</p>} task={<p>문제</p>}>
        <div>시트</div>
      </LearningLayout>,
    );
    // DOM 순서가 작업 공간 → 안내 → 문제여서 화면 낭독기·좁은 화면 모두 작업 공간을 먼저 만난다.
    const regions = [
      screen.getByRole('main'),
      screen.getByRole('complementary', { name: '학습 안내' }),
      screen.getByRole('complementary', { name: '문제와 힌트' }),
    ];
    for (let i = 1; i < regions.length; i += 1) {
      const previous = regions[i - 1];
      const next = regions[i];
      if (previous === undefined || next === undefined) throw new Error('영역이 없습니다');
      expect(
        previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppSidebar } from '@/components/layout/AppSidebar';

/* 사이드바 활성 표시: "학습"은 /learn/level-0 뿐 아니라 모든 /learn/* 경로에서 활성이다 (CARD-04D 수정). */

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppSidebar />
    </MemoryRouter>,
  );
}

describe('AppSidebar 활성 표시', () => {
  it.each(['/learn/level-0', '/learn/level-1', '/learn/level-3', '/learn/level-10'])(
    '%s 에서 학습 항목만 활성이다',
    (path) => {
      renderAt(path);
      expect(screen.getByRole('link', { name: '학습' })).toHaveAttribute('aria-current', 'page');
      for (const name of ['대시보드', '연습실', '설정']) {
        expect(screen.getByRole('link', { name })).not.toHaveAttribute('aria-current');
      }
    },
  );

  it('다른 경로에서는 학습 항목이 활성이 아니다', () => {
    renderAt('/sandbox');
    expect(screen.getByRole('link', { name: '학습' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: '연습실' })).toHaveAttribute('aria-current', 'page');
  });
});

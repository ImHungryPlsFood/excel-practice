import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '@/app/routes';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  it('/ 는 랜딩 페이지를 보여 준다', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('직접 셀을 다루며');
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).toBeNull();
  });

  it('/dashboard 는 사이드바가 있는 대시보드를 보여 준다', () => {
    renderAt('/dashboard');

    expect(screen.getByRole('heading', { level: 1, name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeInTheDocument();
  });

  it('/learn/:courseId 는 미구현임을 명시한 화면을 보여 준다', () => {
    renderAt('/learn/level-0');

    expect(screen.getByRole('heading', { level: 1, name: '학습 화면' })).toBeInTheDocument();
    expect(screen.getByText('이 화면은 아직 구현되지 않았습니다.')).toBeInTheDocument();
  });

  it('/sandbox 는 미구현임을 명시한 화면을 보여 준다', () => {
    renderAt('/sandbox');

    expect(screen.getByRole('heading', { level: 1, name: '샌드박스' })).toBeInTheDocument();
    expect(screen.getByText('이 화면은 아직 구현되지 않았습니다.')).toBeInTheDocument();
  });

  it('알 수 없는 경로는 404 화면을 보여 준다', () => {
    renderAt('/no-such-page');

    expect(
      screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
    ).toBeInTheDocument();
  });

  it('랜딩의 학습 시작 링크를 눌러 대시보드로 전환된다', () => {
    renderAt('/');

    fireEvent.click(screen.getByRole('link', { name: '무료로 학습 시작하기' }));

    expect(screen.getByRole('heading', { level: 1, name: '대시보드' })).toBeInTheDocument();
  });

  it('대시보드의 이어서 학습하기를 눌러 학습 화면으로 전환된다', () => {
    renderAt('/dashboard');

    fireEvent.click(screen.getByRole('link', { name: '이어서 학습하기' }));

    expect(screen.getByRole('heading', { level: 1, name: '학습 화면' })).toBeInTheDocument();
  });

  it('사이드바 링크로 화면을 전환하고 현재 위치를 표시한다', () => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });

    expect(within(nav).getByRole('link', { name: '대시보드' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    fireEvent.click(within(nav).getByRole('link', { name: '샌드박스' }));

    expect(screen.getByRole('heading', { level: 1, name: '샌드박스' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: '샌드박스' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: '대시보드' })).not.toHaveAttribute('aria-current');
  });
});

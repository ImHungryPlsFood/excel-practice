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

// 연습실은 수식 엔진을 포함한 별도 청크라, 전체 테스트를 병렬로 돌릴 때 첫 import 변환이 기본 대기(1초)보다 오래 걸릴 수 있다.
const LAZY_PAGE = { timeout: 15_000 };

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

  it('/sandbox 는 연습실 화면을 보여 준다 (CARD-02D, 따로 내려받는 화면)', async () => {
    renderAt('/sandbox');

    expect(
      await screen.findByRole('heading', { level: 1, name: '연습실' }, LAZY_PAGE),
    ).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: '연습실 도구' })).toBeInTheDocument();
    expect(screen.queryByText('이 화면은 아직 구현되지 않았습니다.')).toBeNull();
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

  it('사이드바에서 구현된 대시보드·연습실만 링크이고 현재 위치를 표시한다', () => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });

    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['대시보드', '연습실']);
    expect(within(nav).getByRole('link', { name: '대시보드' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('사이드바의 연습실 링크를 눌러 연습실로 전환된다', async () => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });

    fireEvent.click(within(nav).getByRole('link', { name: '연습실' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '연습실' }, LAZY_PAGE),
    ).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: '연습실' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it.each(['학습'])('사이드바의 %s 항목은 링크가 아니라 aria-disabled 준비 중 표시다', (label) => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });

    expect(within(nav).queryByRole('link', { name: new RegExp(label) })).toBeNull();
    const item = within(nav).getByText(label).closest('[aria-disabled]');
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).not.toHaveAttribute('href');
    expect(item).toHaveTextContent('준비 중');
  });
});

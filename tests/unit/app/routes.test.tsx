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
/*
 * 연습실 청크를 실제로 내려받는 두 테스트에만 두는 시간 제한.
 * 이 테스트들은 lazy import가 실제 SandboxPage로 이어지는지(별도 청크·내보낸 이름)를 확인하므로 모듈을 가짜로 바꾸지 않는다.
 * 기다리는 것은 엔진 계산이 아니라 HyperFormula를 포함한 모듈의 첫 변환·import다(제목·도구 모음은 엔진 준비 전에 그려진다).
 * 단독 실행은 약 1.6초지만 전체 병렬 실행에서는 다른 무거운 테스트와 겹쳐 vitest 기본 5초를 넘을 수 있다.
 * 위 findByRole 대기(15초)가 실제로 쓰이도록 그보다 길게 둔다. 전역 testTimeout은 바꾸지 않는다.
 */
const LAZY_TEST_TIMEOUT = 20_000;

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

  it(
    '/learn/:courseId 는 코스의 첫 문제와 개념 설명을 보여 준다 (CARD-04D, 따로 내려받는 화면)',
    async () => {
      renderAt('/learn/level-0');

      expect(
        await screen.findByRole('heading', { level: 1, name: '스프레드시트 첫걸음' }, LAZY_PAGE),
      ).toBeInTheDocument();
      expect(screen.getByRole('region', { name: '개념 설명' })).toBeInTheDocument();
      expect(screen.getByText('표에서 칸 하나 가져오기')).toBeInTheDocument();
    },
    LAZY_TEST_TIMEOUT,
  );

  it(
    '없는 코스 주소는 404 화면을 보여 준다',
    async () => {
      renderAt('/learn/level-99');

      expect(
        await screen.findByRole(
          'heading',
          { level: 1, name: '페이지를 찾을 수 없습니다' },
          LAZY_PAGE,
        ),
      ).toBeInTheDocument();
    },
    LAZY_TEST_TIMEOUT,
  );

  it(
    '/sandbox 는 연습실 화면을 보여 준다 (CARD-02D, 따로 내려받는 화면)',
    async () => {
      renderAt('/sandbox');

      expect(
        await screen.findByRole('heading', { level: 1, name: '연습실' }, LAZY_PAGE),
      ).toBeInTheDocument();
      expect(screen.getByRole('toolbar', { name: '연습실 도구' })).toBeInTheDocument();
      expect(screen.queryByText('이 화면은 아직 구현되지 않았습니다.')).toBeNull();
    },
    LAZY_TEST_TIMEOUT,
  );

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

  it(
    '대시보드의 이어서 학습하기를 눌러 학습 화면으로 전환된다',
    async () => {
      renderAt('/dashboard');

      fireEvent.click(screen.getByRole('link', { name: '이어서 학습하기' }));

      expect(
        await screen.findByRole('heading', { level: 1, name: '스프레드시트 첫걸음' }, LAZY_PAGE),
      ).toBeInTheDocument();
    },
    LAZY_TEST_TIMEOUT,
  );

  it('사이드바의 모든 항목이 링크이고 현재 위치를 표시한다', () => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });

    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['대시보드', '학습', '연습실', '설정']);
    expect(within(nav).getByRole('link', { name: '대시보드' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it(
    '사이드바의 연습실 링크를 눌러 연습실로 전환된다',
    async () => {
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
    },
    LAZY_TEST_TIMEOUT,
  );

  it('사이드바의 학습 항목은 /learn/level-0 으로 가는 링크다 (준비 중 표시 없음)', () => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });

    expect(within(nav).getByRole('link', { name: '학습' })).toHaveAttribute(
      'href',
      '/learn/level-0',
    );
    expect(nav).not.toHaveTextContent('준비 중');
  });
});

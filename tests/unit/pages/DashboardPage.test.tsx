import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { createEmptyDashboardData } from '@/features/dashboard/emptyDashboard';
import type { DashboardData } from '@/features/dashboard/types';
import { DashboardPage } from '@/pages/DashboardPage';

function renderDashboard(data?: DashboardData) {
  return render(
    <MemoryRouter>
      <DashboardPage data={data} />
    </MemoryRouter>,
  );
}

const SECTION_TITLES = [
  '학습 현황',
  '오늘의 목표',
  '최근 학습한 내용',
  '복습이 필요한 개념',
  '틀린 문제 다시 풀기',
  '완료한 도전 과제',
  '최근 성취와 기록',
] as const;

describe('DashboardPage — MASTER_PROMPT §4.2 대시보드 9대 정보 (기록 없음 상태)', () => {
  it('현재 학습 단계와 전체 학습 진행률을 보여 준다', () => {
    renderDashboard();

    const summary = screen.getByRole('article', { name: '학습 현황' });
    expect(summary).toHaveTextContent('Level 0 · 완전한 입문 (시작 전)');
    expect(within(summary).getByRole('progressbar', { name: '전체 학습 진행률' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(summary).toHaveTextContent('완료한 단원 0개');
  });

  it('최상단에 이어서 학습하기 카드를 두고 학습 화면으로 연결한다', () => {
    renderDashboard();

    const main = screen.getByRole('heading', { level: 1, name: '대시보드' }).parentElement;
    const regions = main === null ? [] : Array.from(main.children);
    // h1 다음의 첫 번째 블록이 다음 행동 카드여야 한다.
    expect(regions[1]).toBe(screen.getByRole('region', { name: /Level 0/ }));
    expect(screen.getByRole('link', { name: '이어서 학습하기' })).toHaveAttribute(
      'href',
      '/learn/level-0',
    );
  });

  it('오늘의 목표를 0/1로 보여 준다', () => {
    renderDashboard();

    const goal = screen.getByRole('article', { name: '오늘의 목표' });
    expect(goal).toHaveTextContent('0/1');
    expect(within(goal).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it.each([
    ['최근 학습한 내용', '아직 학습 기록이 없습니다'],
    ['복습이 필요한 개념', '복습할 개념이 없습니다'],
    ['틀린 문제 다시 풀기', '다시 풀 문제가 없습니다'],
    ['완료한 도전 과제', '완료한 도전 과제가 없습니다'],
    ['최근 성취와 기록', '아직 성취 기록이 없습니다'],
  ])('%s: 비어 있으면 안내 문구를 보여 주고 가짜 항목을 만들지 않는다', (title, message) => {
    renderDashboard();

    const card = screen.getByRole('article', { name: title });
    expect(card).toHaveTextContent(message);
    expect(within(card).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('9대 정보 영역이 모두 존재한다', () => {
    renderDashboard();

    for (const title of SECTION_TITLES) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole('region', { name: /Level 0/ })).toBeInTheDocument();
  });
});

describe('DashboardPage — 학습 기록이 주입된 경우', () => {
  const data: DashboardData = {
    ...createEmptyDashboardData(),
    currentStage: { level: 3, title: '핵심 함수', started: true },
    nextAction: {
      title: 'SUMIFS 이어서 학습',
      description: '조건 합계 단원의 실습 2단계입니다.',
      to: '/learn/level-3',
      label: '이어서 학습하기',
    },
    dailyGoal: { completed: 2, target: 2, unit: '단원' },
    overallProgress: { completedUnits: 5, totalUnits: 20 },
    recentLessons: [{ id: 'a', title: 'IF 함수', detail: '어제', to: '/learn/level-3' }],
    reviewConcepts: [{ id: 'b', title: '절대 참조' }],
    wrongProblems: [{ id: 'c', title: 'VLOOKUP 문제 3', to: '/learn/level-3' }],
    completedChallenges: [{ id: 'd', title: '단일 수식 설계' }],
    achievements: [{ id: 'e', title: '7일 연속 학습' }],
  };

  it('전달된 단계·진행률·목표를 그대로 표시한다', () => {
    renderDashboard(data);

    expect(screen.getByRole('article', { name: '학습 현황' })).toHaveTextContent(
      'Level 3 · 핵심 함수',
    );
    expect(screen.getByRole('progressbar', { name: '전체 학습 진행률' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    const goal = screen.getByRole('article', { name: '오늘의 목표' });
    expect(goal).toHaveTextContent('2/2');
    expect(goal).toHaveTextContent('목표를 달성했습니다');
    expect(screen.getByRole('link', { name: '이어서 학습하기' })).toHaveAttribute(
      'href',
      '/learn/level-3',
    );
  });

  it('목록 항목을 표시하고, 이동 경로가 있는 항목은 링크로 만든다', () => {
    renderDashboard(data);

    const recent = screen.getByRole('article', { name: '최근 학습한 내용' });
    expect(within(recent).getByRole('link', { name: 'IF 함수' })).toHaveAttribute(
      'href',
      '/learn/level-3',
    );
    expect(recent).toHaveTextContent('어제');
    expect(screen.getByRole('article', { name: '복습이 필요한 개념' })).toHaveTextContent(
      '절대 참조',
    );
    expect(
      within(screen.getByRole('article', { name: '복습이 필요한 개념' })).queryByRole('link'),
    ).toBeNull();
    expect(
      within(screen.getByRole('article', { name: '틀린 문제 다시 풀기' })).getByRole('link', {
        name: 'VLOOKUP 문제 3',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('article', { name: '완료한 도전 과제' })).toHaveTextContent(
      '단일 수식 설계',
    );
    expect(screen.getByRole('article', { name: '최근 성취와 기록' })).toHaveTextContent(
      '7일 연속 학습',
    );
  });
});

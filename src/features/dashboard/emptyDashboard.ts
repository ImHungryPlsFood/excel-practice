import type { DashboardData } from './types';

/**
 * 학습 기록이 없는 사용자의 대시보드 데이터.
 * 학습 진행 저장소는 CARD-06에서 도입되므로, 그 전까지는 모든 사용자가 이 상태로 표시된다.
 * 진행률·성취 등의 수치는 만들어 내지 않고 0 또는 빈 목록으로 둔다.
 */
export function createEmptyDashboardData(): DashboardData {
  return {
    currentStage: { level: 0, title: '완전한 입문', started: false },
    nextAction: {
      title: 'Level 0 · 완전한 입문부터 시작하세요',
      description: '셀·행·열과 주소 체계를 익히는 첫 단원입니다.',
      to: '/learn/level-0',
      label: '이어서 학습하기',
    },
    dailyGoal: { completed: 0, target: 1, unit: '단원' },
    overallProgress: { completedUnits: 0, totalUnits: null },
    recentLessons: [],
    reviewConcepts: [],
    wrongProblems: [],
    completedChallenges: [],
    achievements: [],
  };
}

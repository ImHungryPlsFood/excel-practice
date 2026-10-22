import { ActivityListCard } from '@/features/dashboard/components/ActivityListCard';
import { DailyGoalWidget } from '@/features/dashboard/components/DailyGoalWidget';
import { NextActionCard } from '@/features/dashboard/components/NextActionCard';
import { ProgressSummary } from '@/features/dashboard/components/ProgressSummary';
import { createEmptyDashboardData } from '@/features/dashboard/emptyDashboard';
import type { DashboardData } from '@/features/dashboard/types';

export interface DashboardPageProps {
  /** 학습 기록. 저장소가 연동되는 CARD-06 전까지는 "기록 없음" 상태가 기본값이다. */
  data?: DashboardData;
}

export function DashboardPage({ data = createEmptyDashboardData() }: DashboardPageProps) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold text-fg">대시보드</h1>
      <NextActionCard action={data.nextAction} />
      <div className="grid gap-6 md:grid-cols-2">
        <ProgressSummary stage={data.currentStage} progress={data.overallProgress} />
        <DailyGoalWidget goal={data.dailyGoal} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ActivityListCard
          id="recent-lessons"
          title="최근 학습한 내용"
          items={data.recentLessons}
          emptyMessage="아직 학습 기록이 없습니다. 위의 '이어서 학습하기'로 첫 단원을 시작해 보세요."
        />
        <ActivityListCard
          id="review-concepts"
          title="복습이 필요한 개념"
          items={data.reviewConcepts}
          emptyMessage="복습할 개념이 없습니다. 단원을 학습하면 복습 시점이 된 개념이 여기에 표시됩니다."
        />
        <ActivityListCard
          id="wrong-problems"
          title="틀린 문제 다시 풀기"
          items={data.wrongProblems}
          emptyMessage="다시 풀 문제가 없습니다. 문제를 풀다 틀린 문제가 여기에 모입니다."
        />
        <ActivityListCard
          id="completed-challenges"
          title="완료한 도전 과제"
          items={data.completedChallenges}
          emptyMessage="완료한 도전 과제가 없습니다."
        />
        <ActivityListCard
          id="achievements"
          title="최근 성취와 기록"
          items={data.achievements}
          emptyMessage="아직 성취 기록이 없습니다."
        />
      </div>
    </div>
  );
}

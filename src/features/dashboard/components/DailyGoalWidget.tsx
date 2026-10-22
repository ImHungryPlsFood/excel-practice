import { Card } from '@/components/ui/Card';

import type { DailyGoal } from '../types';

export interface DailyGoalWidgetProps {
  goal: DailyGoal;
}

/** 오늘의 목표 (R-04.10). */
export function DailyGoalWidget({ goal }: DailyGoalWidgetProps) {
  const reached = goal.target > 0 && goal.completed >= goal.target;
  const percent =
    goal.target > 0 ? Math.min(100, Math.round((goal.completed / goal.target) * 100)) : 0;
  return (
    <Card as="article" aria-labelledby="daily-goal-title" className="flex flex-col gap-3">
      <h2 id="daily-goal-title" className="text-base font-semibold text-fg">
        오늘의 목표
      </h2>
      <p className="text-fg">
        {goal.unit} {goal.target}개 완료하기 ({goal.completed}/{goal.target})
      </p>
      <div
        role="progressbar"
        aria-label="오늘의 목표 달성률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-fg-secondary">
        {reached ? '오늘의 목표를 달성했습니다.' : '아직 오늘 완료한 학습이 없습니다.'}
      </p>
    </Card>
  );
}

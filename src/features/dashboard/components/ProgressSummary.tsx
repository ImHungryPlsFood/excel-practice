import { Card } from '@/components/ui/Card';

import type { CurrentStage, OverallProgress } from '../types';

export interface ProgressSummaryProps {
  stage: CurrentStage;
  progress: OverallProgress;
}

/** 현재 학습 단계(R-04.08)와 전체 학습 진행률(R-04.11). */
export function ProgressSummary({ stage, progress }: ProgressSummaryProps) {
  const { completedUnits, totalUnits } = progress;
  const percent =
    totalUnits !== null && totalUnits > 0
      ? Math.min(100, Math.round((completedUnits / totalUnits) * 100))
      : 0;
  return (
    <Card as="article" aria-labelledby="progress-summary-title" className="flex flex-col gap-4">
      <h2 id="progress-summary-title" className="text-base font-semibold text-fg">
        학습 현황
      </h2>
      <div>
        <p className="text-sm text-fg-secondary">현재 학습 단계</p>
        <p className="mt-1 text-lg font-semibold text-fg">
          Level {stage.level} · {stage.title}
          {stage.started ? '' : ' (시작 전)'}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-fg-secondary">전체 학습 진행률</p>
        <div
          role="progressbar"
          aria-label="전체 학습 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-subtle"
        >
          <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-fg">
          {percent}% · 완료한 단원 {completedUnits}개
        </p>
      </div>
    </Card>
  );
}

/** 대시보드가 표시하는 학습 데이터 모델 (MASTER_PROMPT §4.2). 저장소 연동은 CARD-06에서 이 모델을 채운다. */

export interface DashboardLink {
  /** 앱 내부 경로. */
  to: string;
  label: string;
}

export interface NextAction extends DashboardLink {
  title: string;
  description: string;
}

export interface CurrentStage {
  level: number;
  title: string;
  /** 학습을 시작했는지 여부. false이면 "시작 전" 단계다. */
  started: boolean;
}

export interface DailyGoal {
  completed: number;
  target: number;
  /** 목표 단위, 예: "단원". */
  unit: string;
}

export interface OverallProgress {
  completedUnits: number;
  /** 전체 단원 수. 학습 콘텐츠가 연결되기 전에는 null. */
  totalUnits: number | null;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail?: string;
  /** 해당 항목으로 이동하는 내부 경로. 이동할 곳이 없으면 생략한다. */
  to?: string;
}

export interface DashboardData {
  currentStage: CurrentStage;
  nextAction: NextAction;
  dailyGoal: DailyGoal;
  overallProgress: OverallProgress;
  recentLessons: readonly ActivityItem[];
  reviewConcepts: readonly ActivityItem[];
  wrongProblems: readonly ActivityItem[];
  completedChallenges: readonly ActivityItem[];
  achievements: readonly ActivityItem[];
}

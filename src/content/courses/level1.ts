import type { CourseMeta } from '@/types/problem.schema';

/* Level 1 코스 메타데이터 (CARD-04D). 셀 서식 기능이 생기기 전까지 수식으로 "값과 보이는 모양"을 연습한다. */
export const course: CourseMeta = {
  id: 'level-1',
  title: '표 정리와 표시',
  description: '숫자를 알맞은 자릿수와 단위로 정리해 보고서에 보여 주는 방법을 익힙니다.',
  modules: [
    {
      id: 'MOD-L01-01',
      courseId: 'level-1',
      examVersion: 'standard',
      title: '자릿수와 단위 정리',
      learningArea: '표 서식',
      difficulty: 'beginner',
      prerequisites: [],
      objectives: ['소수 자릿수를 ROUND로 맞춘다', '숫자 뒤에 단위를 붙여 표시한다'],
      conceptSummary:
        '같은 숫자라도 보고서에는 알맞은 자릿수와 단위로 보여 줘야 읽기 쉽습니다. 계산에 쓸 숫자 칸은 그대로 두고 표시용 칸을 따로 만드는 습관이 중요합니다.',
      workUseCase: '재고 회전율이나 지출 내역을 월간 보고서로 정리할 때 쓰입니다.',
      problemIds: ['PRB-L01-ROUND-01', 'PRB-L01-UNIT-01'],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [{ keys: 'F2', description: '선택한 셀을 편집 모드로 전환' }],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 2, requireTutorial: false },
    },
  ],
};

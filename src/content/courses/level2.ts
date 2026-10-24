import type { CourseMeta } from '@/types/problem.schema';

/* Level 2 코스 메타데이터 (CARD-04D). */
export const course: CourseMeta = {
  id: 'level-2',
  title: '수식과 셀 참조',
  description: '사칙연산, 상대 참조, 절대 참조로 복사해도 맞는 수식을 만듭니다.',
  modules: [
    {
      id: 'MOD-L02-01',
      courseId: 'level-2',
      examVersion: 'standard',
      title: '계산식과 상대 참조',
      learningArea: '수식 기초',
      difficulty: 'beginner',
      prerequisites: [],
      objectives: [
        '연산 우선순위에 맞게 식을 쓴다',
        '수식을 복사하면 참조가 따라 움직임을 이해한다',
      ],
      conceptSummary:
        '수식은 곱셈·나눗셈을 먼저 계산하고, 칸 주소를 쓰면 값이 바뀔 때 결과도 따라 바뀝니다. 수식을 복사하면 칸 주소도 같은 만큼 움직입니다(상대 참조).',
      workUseCase:
        '주문 금액 계산이나 월별 지출 합계처럼 같은 계산을 여러 줄·여러 열에 반복할 때 쓰입니다.',
      problemIds: ['PRB-L02-ARITH-01', 'PRB-L02-REL-01'],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [
        { keys: 'Ctrl+R', description: '왼쪽 칸의 내용을 선택한 범위 오른쪽으로 채우기' },
      ],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 2, requireTutorial: false },
    },
    {
      id: 'MOD-L02-02',
      courseId: 'level-2',
      examVersion: 'standard',
      title: '절대 참조',
      learningArea: '수식 기초',
      difficulty: 'intermediate',
      prerequisites: ['MOD-L02-01'],
      objectives: ['$로 칸 주소를 고정한다', '채워도 움직이지 않아야 할 칸을 구분한다'],
      conceptSummary:
        '주소 앞에 $를 붙이면 복사하거나 채워도 그 열 또는 행이 바뀌지 않습니다. 전체 합계처럼 모든 줄이 함께 쓰는 값에 사용합니다.',
      workUseCase:
        '부서 예산이 전체에서 차지하는 비율처럼 한 값을 기준으로 여러 줄을 계산할 때 쓰입니다.',
      problemIds: ['PRB-L02-ABS-01'],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [{ keys: 'F4', description: '수식 입력 중 주소의 $ 고정 방식을 바꾸기' }],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 1, requireTutorial: false },
    },
  ],
};

import type { CourseMeta } from '@/types/problem.schema';

/* Level 0 코스 메타데이터 (CARD-04A). 문제 본문은 src/content/exercises/ (CARD-04D)에서 추가한다. */
export const course: CourseMeta = {
  id: 'level-0',
  title: '스프레드시트 첫걸음',
  description: '셀 선택, 데이터 입력, 채우기까지 스프레드시트의 기본 조작을 익힙니다.',
  modules: [
    {
      id: 'MOD-L00-01',
      courseId: 'level-0',
      examVersion: 'standard',
      title: '셀 선택과 데이터 입력',
      learningArea: '기본 조작',
      difficulty: 'intro',
      prerequisites: [],
      objectives: ['셀과 범위를 선택한다', '셀에 값을 입력하고 고친다'],
      conceptSummary: '스프레드시트는 행과 열이 만나는 칸(셀)에 값을 넣고 계산하는 도구입니다.',
      workUseCase: '출석부나 거래 내역처럼 표 형태의 기록을 직접 입력할 때 쓰입니다.',
      tutorialId: 'MOD-L00-01',
      problemIds: [],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [
        { keys: 'F2', description: '선택한 셀을 편집 모드로 전환' },
        { keys: 'Enter', description: '입력을 확정하고 아래 셀로 이동' },
      ],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 0, requireTutorial: true },
    },
  ],
};

import type { CourseMeta } from '@/types/problem.schema';

/* Level 0 코스 메타데이터 (CARD-04A). 문제 본문은 src/content/exercises/level0/ (CARD-04D)에 있다. */
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
      problemIds: ['PRB-L00-REF-01'],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [
        { keys: 'F2', description: '선택한 셀을 편집 모드로 전환' },
        { keys: 'Enter', description: '입력을 확정하고 아래 셀로 이동' },
      ],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 1, requireTutorial: true },
    },
    {
      id: 'MOD-L00-02',
      courseId: 'level-0',
      examVersion: 'standard',
      title: '범위 선택과 채우기',
      learningArea: '기본 조작',
      difficulty: 'intro',
      prerequisites: ['MOD-L00-01'],
      objectives: ['여러 칸을 범위로 선택한다', '채우기 핸들로 수식을 아래로 채운다'],
      conceptSummary:
        '범위는 시작 칸과 끝 칸을 콜론(:)으로 이어 쓴 여러 칸이고, 채우기는 한 칸의 수식을 이웃 칸에 이어 넣는 기능입니다.',
      workUseCase:
        '출석표의 일부 구간을 더하거나, 상품별 금액처럼 같은 계산을 여러 줄에 반복할 때 쓰입니다.',
      problemIds: ['PRB-L00-RANGE-01', 'PRB-L00-FILL-01'],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [
        { keys: 'Ctrl+D', description: '위 칸의 내용을 선택한 범위 아래로 채우기' },
        { keys: 'Shift+방향키', description: '선택 범위 넓히기' },
      ],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 2, requireTutorial: false },
    },
  ],
};

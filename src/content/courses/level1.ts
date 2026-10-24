import type { CourseMeta } from '@/types/problem.schema';

/*
 * Level 1 코스 메타데이터. 문제는 아직 없다(준비 중).
 * 시트에 셀 서식(표시 형식·글꼴·정렬·테두리) 상태와 조작 기능이 생기기 전에는 서식 문제를 만들 수 없다.
 * ROUND·& 같은 수식으로 대신하면 "값은 그대로 두고 보이는 모양만 바꾸는" 서식 개념과 "값 자체를 바꾸는" 함수를
 * 학생이 혼동하므로, 해당 문제는 Level 3(MOD-L03-08, MOD-L03-12)에 두었다. (CARD-04D 수정, R-05.11~13)
 */
export const course: CourseMeta = {
  id: 'level-1',
  title: '데이터 입력과 서식',
  description:
    '숫자 표시 형식, 글꼴, 정렬, 테두리로 표를 읽기 쉽게 만듭니다. 서식 기능이 생긴 뒤 열립니다.',
  modules: [
    {
      id: 'MOD-L01-02',
      courseId: 'level-1',
      examVersion: 'standard',
      title: '숫자 표시 형식',
      learningArea: '표 서식',
      difficulty: 'beginner',
      prerequisites: [],
      objectives: ['천 단위 쉼표, 백분율, 소수 자릿수 표시를 바꾼다'],
      conceptSummary:
        '표시 형식은 칸의 값은 그대로 두고 보이는 모양만 바꿉니다. 수식에서 그 칸을 참조하면 원래 값이 쓰입니다.',
      workUseCase: '금액과 비율을 보고서에서 읽기 쉽게 보여 줄 때 쓰입니다.',
      problemIds: [],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 0, requireTutorial: false },
    },
  ],
};

import type { CourseMeta } from '@/types/problem.schema';

/* Level 3 코스 메타데이터 (CARD-04D). */
export const course: CourseMeta = {
  id: 'level-3',
  title: '기본 함수',
  description: 'SUM과 AVERAGE로 실제 업무 데이터의 합계와 평균을 구합니다.',
  modules: [
    {
      id: 'MOD-L03-01',
      courseId: 'level-3',
      examVersion: 'standard',
      title: 'SUM과 AVERAGE',
      learningArea: '기본 함수',
      difficulty: 'beginner',
      prerequisites: [],
      objectives: ['빈 칸이 섞인 범위의 합계를 구한다', '빈 칸을 제외한 평균을 구한다'],
      conceptSummary:
        'SUM은 범위 안의 숫자를 더하고, AVERAGE는 숫자가 있는 칸만으로 평균을 냅니다. 둘 다 빈 칸과 글자는 건너뜁니다.',
      workUseCase:
        '아직 정산되지 않은 지출이 섞인 장부나, 결시한 시험이 있는 성적표를 정리할 때 쓰입니다.',
      problemIds: ['PRB-L03-SUM-02', 'PRB-L03-AVG-01'],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [{ keys: 'Alt+=', description: '선택한 칸 근처에 SUM 수식 자동 입력(Excel)' }],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 2, requireTutorial: false },
    },
  ],
};

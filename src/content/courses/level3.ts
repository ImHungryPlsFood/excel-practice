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
    {
      id: 'MOD-L03-08',
      courseId: 'level-3',
      examVersion: 'standard',
      title: 'ROUND 반올림',
      learningArea: '기본 함수',
      difficulty: 'beginner',
      prerequisites: ['MOD-L03-01'],
      objectives: [
        'ROUND로 값을 원하는 자릿수까지 반올림한다',
        '반올림은 보이는 모양이 아니라 값 자체를 바꾼다는 것을 안다',
      ],
      conceptSummary:
        'ROUND(값, 자릿수)는 값 자체를 지정한 자릿수로 반올림합니다. 이 결과를 다른 수식에서 쓰면 반올림된 값이 계산에 쓰입니다.',
      workUseCase:
        '재고 회전율이나 단가 계산처럼 소수점 아래가 길게 나오는 결과의 자릿수를 정해야 할 때 쓰입니다.',
      problemIds: ['PRB-L03-ROUND-01'],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 1, requireTutorial: false },
    },
    {
      id: 'MOD-L03-12',
      courseId: 'level-3',
      examVersion: 'standard',
      title: '글자 이어 붙이기',
      learningArea: '기본 함수',
      difficulty: 'beginner',
      prerequisites: ['MOD-L03-01'],
      objectives: [
        '& 로 칸의 값과 글자를 이어 붙인다',
        '이어 붙인 결과는 숫자가 아니라 글자임을 안다',
      ],
      conceptSummary:
        '& 는 두 값을 이어 붙여 하나의 글자로 만듭니다. 숫자 칸은 그대로 두고 옆 칸에 보고서용 문장을 만들 때 씁니다.',
      workUseCase:
        '금액 뒤에 단위를 붙이거나 이름과 직책을 한 칸에 합쳐 안내문을 만들 때 쓰입니다.',
      problemIds: ['PRB-L03-CONCAT-01'],
      reviewIntervalsDays: [1, 3, 7, 14, 30],
      shortcuts: [],
      supportedEnvironments: ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'],
      completion: { minProblemsPassed: 1, requireTutorial: false },
    },
  ],
};

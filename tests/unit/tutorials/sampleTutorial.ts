import { TutorialDefinitionSchema } from '@/types/tutorial.schema';

/** 테스트 전용 튜토리얼 데이터. 스키마를 통과시켜 기본값을 채운다. */
export function buildSampleTutorial() {
  return TutorialDefinitionSchema.parse({
    id: 'MOD-L03-SUM-01',
    courseId: 'level-3',
    moduleId: 'MOD-L03-SUM-01',
    title: 'SUM으로 합계 구하기',
    steps: [
      {
        id: 'select-b2',
        title: 'B2 선택',
        description: '합계를 넣을 B2 셀을 클릭하세요.',
        highlight: { type: 'CELL', cell: 'B2' },
        expectedAction: { type: 'SELECT_CELL', cell: 'B2' },
        failure: { messages: { WRONG_TARGET: 'B2 셀을 선택해야 합니다.' } },
        hints: ['열 B, 행 2의 교차점입니다.'],
        successMessage: 'B2를 선택했습니다.',
        canSkip: true,
      },
      {
        id: 'type-sum',
        title: 'SUM 입력',
        description: 'B3부터 B7까지의 합계를 구하세요.',
        highlight: { type: 'RANGE', range: 'B3:B7' },
        expectedAction: {
          type: 'ENTER_FORMULA',
          cell: 'B2',
          canonicalFormula: '=SUM(B3:B7)',
          expectedFormulaPattern: '^=SUM\\(B3:B7\\)$',
          expectedResult: 150,
          requiredFunctions: ['SUM'],
        },
        allowedInput: { cells: ['B2'] },
        failure: { autoHintAfterAttempts: 2 },
        hints: ['SUM 함수를 쓰세요.', '범위는 B3:B7입니다.', '=SUM(B3:B7)'],
        successMessage: '합계가 계산되었습니다.',
        next: { mode: 'confirm' },
      },
      {
        id: 'press-f2',
        title: 'F2로 수정',
        description: 'F2 키로 셀 편집 모드에 들어가 보세요.',
        highlight: { type: 'FORMULA_BAR' },
        expectedAction: { type: 'PRESS_KEY', keys: ['F2'] },
        successMessage: '편집 모드입니다.',
        back: { allowed: false },
      },
    ],
  });
}

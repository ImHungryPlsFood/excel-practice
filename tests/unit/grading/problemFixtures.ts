import type { CourseMeta, Misconception, ProblemDefinitionInput } from '@/types/problem.schema';

/** 테스트 전용 문제·코스. 실제 콘텐츠(src/content/exercises)는 CARD-04D에서 만든다. */
export function buildProblem(
  overrides: Partial<ProblemDefinitionInput> = {},
): ProblemDefinitionInput {
  return {
    id: 'PRB-L03-SUM-01',
    courseId: 'level-3',
    moduleId: 'MOD-L03-SUM',
    difficulty: 'beginner',
    title: '월 매출 합계',
    goal: 'B2:B6의 매출 합계를 B7에 구하세요.',
    conditions: ['표의 숫자를 직접 더해 입력하지 않습니다.'],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['항목', '금액'],
            ['A', 100],
            ['B', 250],
            ['C', 80],
            ['D', 300],
            ['E', 120],
          ],
          readOnlyRanges: ['A1:B6'],
        },
      },
    },
    allowedActions: ['ENTER_FORMULA', 'COPY_PASTE'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'B7',
      canonicalFormula: '=SUM(B2:B6)',
      expectedResult: 850,
      mode: 'REQUIRE_FUNCTION',
      requiredFunctions: ['SUM'],
      forbiddenFunctions: [],
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value: 10 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B6' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '850',
        feedback:
          '계산된 값을 직접 입력하셨습니다. 표 값이 바뀌어도 결과가 따라오도록 수식을 쓰세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=SUM(B2:B5)',
        feedback: '합계 범위에 마지막 행(B6)이 빠졌습니다.',
      },
    ],
    hints: [
      '여러 칸을 한 번에 더하는 함수를 떠올려 보세요.',
      '금액이 들어 있는 B열의 데이터 범위를 사용합니다.',
      '=함수이름(시작:끝) 모양입니다.',
      '=SUM(B2:B6) — 범위 전체를 더하므로 값이 바뀌어도 합계가 갱신됩니다.',
    ],
    explanation: 'SUM은 범위 안의 숫자를 모두 더합니다.',
    recommendedSolution: {
      steps: ['B7을 선택한다', '=SUM(B2:B6)을 입력한다'],
      formula: '=SUM(B2:B6)',
    },
    alternativeSolutions: [{ description: '덧셈 연산자로 잇기', formula: '=B2+B3+B4+B5+B6' }],
    completionCriteria: 'B7이 B2:B6의 합계를 수식으로 계산한다.',
    ...overrides,
  };
}

/** 소수 데이터(최대 2자리)와 ROUND를 쓰는 문제: 평균 단가를 소수 둘째 자리까지 구한다. */
export function buildDecimalRoundProblem(
  overrides: Partial<ProblemDefinitionInput> = {},
): ProblemDefinitionInput {
  const base = buildProblem();
  return buildProblem({
    id: 'PRB-L03-ROUND-01',
    title: '평균 단가',
    goal: 'B2:B6의 평균 단가를 소수 둘째 자리까지 반올림해 B7에 구하세요.',
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['품목', '단가'],
            ['A', 12.35],
            ['B', 8.25],
            ['C', 3.8],
            ['D', 20.15],
            ['E', 5.5],
          ],
          readOnlyRanges: ['A1:B6'],
        },
      },
    },
    grading: {
      ...base.grading,
      canonicalFormula: '=ROUND(AVERAGE(B2:B6),2)',
      expectedResult: 10.01,
      requiredFunctions: ['ROUND', 'AVERAGE'],
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value: 10.25 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B6' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '10.01',
        feedback: '계산된 값을 직접 입력하셨습니다. 단가가 바뀌어도 따라오는 수식을 쓰세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=ROUND(AVERAGE(B2:B5),2)',
        feedback: '평균 범위에 마지막 행(B6)이 빠졌습니다.',
      },
    ],
    recommendedSolution: { steps: ['B7에 입력한다'], formula: '=ROUND(AVERAGE(B2:B6),2)' },
    alternativeSolutions: [],
    explanation: 'AVERAGE로 평균을 구하고 ROUND로 둘째 자리까지 맞춥니다.',
    ...overrides,
  });
}

/** 기본 문제의 시트를 일부만 바꾼 문제 */
export function buildProblemWithSheet(
  patch: Partial<ProblemDefinitionInput['initialWorkbook']['sheets'][string]>,
): ProblemDefinitionInput {
  const base = buildProblem();
  const sheet = base.initialWorkbook.sheets['Sheet1'];
  return buildProblem({
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: { Sheet1: { initialData: [], ...sheet, ...patch } },
    },
  });
}

export const sampleMisconceptions = [
  {
    diagnosis: 'HARDCODED_VALUE',
    input: '850',
    feedback: '계산된 값을 직접 입력하셨습니다. 표 값이 바뀌어도 결과가 따라오도록 수식을 쓰세요.',
  },
  {
    diagnosis: 'INCOMPLETE_RANGE',
    input: '=SUM(B2:B5)',
    feedback: '합계 범위에 마지막 행(B6)이 빠졌습니다.',
  },
] as const satisfies readonly Misconception[];

export const fixtureCourse: CourseMeta = {
  id: 'level-3',
  title: '테스트 코스',
  description: '테스트용',
  modules: [
    {
      id: 'MOD-L03-SUM',
      courseId: 'level-3',
      examVersion: 'standard',
      title: 'SUM',
      learningArea: '함수',
      difficulty: 'beginner',
      prerequisites: [],
      objectives: ['SUM을 쓴다'],
      conceptSummary: '합계',
      workUseCase: '매출 합계',
      problemIds: ['PRB-L03-SUM-01'],
      reviewIntervalsDays: [1, 3],
      shortcuts: [],
      supportedEnvironments: ['EXCEL_WEB'],
      completion: { minProblemsPassed: 1, requireTutorial: false },
    },
  ],
};

/** 절대 참조 문제: 수량(B열)에 배수(E1)를 곱해 C2에 넣고, 아래로 복사한다. */
export function buildAbsoluteRefProblem(
  overrides: Partial<ProblemDefinitionInput> = {},
): ProblemDefinitionInput {
  const base = buildProblem();
  return buildProblem({
    id: 'PRB-L03-ABS-01',
    title: '배수 곱하기',
    goal: 'C2에 B2에 E1의 배수를 곱한 값을 구하고, 아래로 복사해도 같은 배수를 쓰게 하세요.',
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['품목', '수량', '금액', '배수', 3],
            ['A', 100],
            ['B', 250],
            ['C', 80],
            ['D', 300],
            ['E', 120],
          ],
          readOnlyRanges: ['A1:B6', 'D1:E1'],
        },
      },
    },
    grading: {
      ...base.grading,
      targetCell: 'C2',
      canonicalFormula: '=B2*$E$1',
      expectedResult: 300,
      mode: 'ALLOW_EQUIVALENT',
      requiredFunctions: [],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '300',
        feedback: '계산된 값을 직접 입력하셨습니다. 수량이 바뀌어도 따라오는 수식을 쓰세요.',
      },
      {
        diagnosis: 'MISSING_ABSOLUTE_REF',
        input: '=B2*E1',
        feedback: '배수 셀은 아래로 복사해도 움직이지 않도록 고정해야 합니다.',
      },
    ],
    recommendedSolution: { steps: ['C2에 입력한다'], formula: '=B2*$E$1' },
    alternativeSolutions: [],
    explanation: '배수 셀을 $E$1로 고정하면 복사해도 같은 셀을 곱합니다.',
    ...overrides,
  });
}

/** 합계 문제에 '현재 데이터에서만 맞는 답' 대표 오답을 더한 문제 */
export function buildDataDependentProblem(): ProblemDefinitionInput {
  return buildProblem({
    misconceptions: [
      ...sampleMisconceptions,
      {
        diagnosis: 'DATA_DEPENDENT',
        input: '=SUM(B2:B5)+120',
        feedback: '마지막 값을 직접 써 넣어 지금 데이터에서만 맞습니다.',
      },
    ],
  });
}

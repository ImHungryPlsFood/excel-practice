import type { ProblemDefinitionInput } from '@/types/problem.schema';

/* Level 3 문제 2개 (CARD-04D): 빈 칸이 섞인 데이터의 SUM과 AVERAGE. 모든 이름·숫자는 가상 데이터다. */
export const problems: ProblemDefinitionInput[] = [
  {
    id: 'PRB-L03-SUM-02',
    courseId: 'level-3',
    moduleId: 'MOD-L03-01',
    difficulty: 'beginner',
    title: '정산이 덜 끝난 행사 지출 합계',
    goal: '동아리 행사 지출표의 금액 합계를 C11에 구하세요. 아직 정산되지 않아 금액이 비어 있는 줄도 표에 있습니다.',
    conditions: [
      '금액 열(C2:C9) 전체를 대상으로 합니다.',
      '빈 칸은 0으로 채우지 않습니다. 지출표(A1:D9)는 고칠 수 없습니다.',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['날짜', '내용', '금액', '메모'],
            ['10/03', '현수막 제작', 32000, '영수증 있음'],
            ['10/03', '간식', 18500, null],
            ['10/04', '대관료', null, '정산 예정'],
            ['10/04', '포스터 인쇄', 14400, null],
            ['10/05', '음료', 9600, '현금 결제'],
            ['10/05', '상품', 27300, null],
            ['10/06', '교통비', null, '정산 예정'],
            ['10/06', '사진 인화', 6800, null],
            [null],
            ['지출 합계'],
          ],
          readOnlyRanges: ['A1:D9', 'A11'],
        },
      },
    },
    allowedActions: ['ENTER_VALUE', 'ENTER_FORMULA'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'C11',
      canonicalFormula: '=SUM(C2:C9)',
      expectedResult: 108600,
      mode: 'REQUIRE_FUNCTION',
      requiredFunctions: ['SUM'],
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'C2:C9', value: 100 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'C2:C9' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'C2:C9', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '108600',
        feedback:
          '합계를 직접 입력하셨습니다. 정산이 끝나 빈 칸에 금액이 채워지면 합계도 바뀌어야 하니 SUM으로 구하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=SUM(C2:C8)',
        feedback: '범위가 마지막 줄(사진 인화)을 포함하지 못합니다. 끝 칸을 확인하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=SUM(C3:C9)',
        feedback: '범위가 첫 줄(현수막 제작)을 포함하지 못합니다. 시작 칸을 확인하세요.',
      },
    ],
    hints: [
      '합계 함수는 빈 칸이 있어도 숫자인 칸만 더합니다. 빈 칸 때문에 범위를 쪼갤 필요는 없습니다.',
      '금액이 있는 열의 첫 줄부터 마지막 줄까지 한 범위로 선택합니다.',
      '=SUM(시작칸:끝칸) 모양입니다. 머리글(C1)은 범위에 넣지 않습니다.',
      '=SUM(C2:C9) 를 입력합니다. 비어 있는 C4, C8은 자동으로 건너뛰고, 나중에 금액이 채워지면 합계에 바로 반영됩니다.',
    ],
    explanation:
      'SUM은 범위 안의 숫자만 더하고 빈 칸과 글자는 무시합니다. 정산이 늦어진 칸이 있어도 범위 전체를 한 번에 지정해 두면, 나중에 값이 채워질 때 합계가 알아서 갱신됩니다.',
    recommendedSolution: {
      steps: [
        'C11 칸을 선택한다',
        '=SUM( 을 입력하고 C2부터 C9까지 선택한다',
        ') 를 닫고 Enter를 누른다',
      ],
      formula: '=SUM(C2:C9)',
      requiredActions: ['ENTER_FORMULA'],
    },
    completionCriteria: 'C11이 금액 열 전체(C2:C9)를 SUM으로 더한다.',
  },
  {
    id: 'PRB-L03-AVG-01',
    courseId: 'level-3',
    moduleId: 'MOD-L03-01',
    difficulty: 'intermediate',
    title: '시험을 못 본 회차를 뺀 평균',
    goal: '서윤 학생의 4회 시험 평균 점수를 G7에 구하세요. 서윤은 3회 시험에 결시해 점수 칸이 비어 있습니다.',
    conditions: [
      '결시한 회차는 평균 계산에서 제외합니다(0점으로 계산하지 않습니다).',
      'AVERAGE 함수를 사용합니다. 점수표(A1:E5)는 고칠 수 없습니다.',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['이름', '1회', '2회', '3회', '4회'],
            ['하준', 74, 81, 69, 90],
            ['서윤', 88, 79, null, 92],
            ['도현', 65, null, 72, 70],
            ['지아', 91, 87, 94, 85],
            [null],
            [null, null, null, null, null, '서윤 평균'],
          ],
          readOnlyRanges: ['A1:E5', 'F7'],
        },
      },
    },
    allowedActions: ['ENTER_VALUE', 'ENTER_FORMULA'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'G7',
      canonicalFormula: '=AVERAGE(B3:E3)',
      expectedResult: 86.33333333333333,
      mode: 'REQUIRE_FUNCTION',
      requiredFunctions: ['AVERAGE'],
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'B3:E3', value: 4 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:E5' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B3:E3', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '86.33',
        feedback:
          '평균 값을 직접 입력하셨습니다. 점수가 고쳐지면 평균도 바뀌어야 하니 AVERAGE로 구하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=AVERAGE(B3:C3)',
        feedback: '범위가 1·2회까지만 포함합니다. 4회 점수가 있는 칸까지 선택했는지 확인하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=AVERAGE(B2:E2)',
        feedback: '서윤이 아니라 다른 학생(하준)의 줄입니다. 서윤의 점수가 있는 줄을 찾으세요.',
      },
    ],
    hints: [
      '평균 함수는 빈 칸을 건너뛰고 숫자가 있는 칸만으로 평균을 냅니다.',
      '서윤의 줄에서 1회부터 4회까지 전체를 한 범위로 선택합니다. 비어 있는 3회 칸도 범위 안에 둡니다.',
      '=AVERAGE(시작칸:끝칸) 모양입니다. 합계를 4로 나누면 빈 칸이 0점처럼 계산되어 평균이 낮아집니다.',
      '서윤은 3행이므로 =AVERAGE(B3:E3) 입니다. 값이 있는 세 회차(88, 79, 92)로만 평균이 계산됩니다.',
    ],
    explanation:
      'AVERAGE는 빈 칸을 개수에서도 제외합니다. 그래서 결시한 회차를 0점으로 입력하지 않고 비워 두면 실제 응시한 시험만으로 평균이 나옵니다. 합계를 고정된 횟수로 나누는 방식은 빈 칸이 생기면 틀립니다.',
    recommendedSolution: {
      steps: [
        'G7 칸을 선택한다',
        '=AVERAGE( 를 입력하고 B3부터 E3까지 선택한다',
        ') 를 닫고 Enter를 누른다',
      ],
      formula: '=AVERAGE(B3:E3)',
      requiredActions: ['ENTER_FORMULA'],
    },
    completionCriteria: 'G7이 서윤의 점수 구간(B3:E3)을 AVERAGE로 평균 낸다.',
  },
];

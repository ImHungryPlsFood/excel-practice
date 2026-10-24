import type { ProblemDefinitionInput } from '@/types/problem.schema';

/*
 * Level 3 함수 문제 2개 (CARD-04D): ROUND(값 자체를 반올림)와 &(글자 이어 붙이기).
 * 둘 다 "값을 만드는 수식"이며 셀 서식(표시 형식)과는 다른 개념이다. 서식 문제는 서식 기능이 생긴 뒤 Level 1에 둔다.
 */
export const problems: ProblemDefinitionInput[] = [
  {
    id: 'PRB-L03-ROUND-01',
    courseId: 'level-3',
    moduleId: 'MOD-L03-08',
    difficulty: 'beginner',
    title: '소수점 둘째 자리까지 반올림하기',
    goal: '첫 번째 상품의 재고 회전율(월 판매량 ÷ 평균 재고)을 소수 셋째 자리에서 반올림한 값으로 D2에 구하세요. 반올림한 값 자체가 D2에 들어가야 합니다.',
    conditions: [
      '나누는 값도 숫자를 직접 쓰지 않고 표의 칸을 가리킵니다.',
      '표의 원본 칸(A1:C5)은 고칠 수 없습니다.',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['상품', '월 판매량', '평균 재고', '회전율'],
            ['보리차 티백', 130, 47],
            ['핸드크림', 64, 29],
            ['손수건', 88, 35],
            ['휴대용 컵', 51, 22],
          ],
          readOnlyRanges: ['A1:C5', 'D1'],
        },
      },
    },
    allowedActions: ['ENTER_FORMULA'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'D2',
      canonicalFormula: '=ROUND(B2/C2,2)',
      expectedResult: 2.77,
      mode: 'REQUIRE_FUNCTION',
      requiredFunctions: ['ROUND'],
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'B2:C2', value: 3 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:C5' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B5', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '2.77',
        feedback:
          '계산한 값을 직접 입력하셨습니다. 판매량이나 재고가 바뀌어도 맞도록 두 칸을 나누는 수식 안에서 반올림하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=ROUND(B2/C3,2)',
        feedback:
          '나누는 칸이 다른 상품의 평균 재고입니다. 같은 상품의 줄을 가리키는지 확인하세요.',
      },
      {
        diagnosis: 'DATA_DEPENDENT',
        input: '=ROUND(B2/47,2)',
        feedback:
          '평균 재고를 숫자 47로 직접 적으셨습니다. 지금은 값이 맞지만 재고 칸이 바뀌면 틀립니다. 그 칸의 주소를 쓰세요.',
      },
    ],
    hints: [
      '나눗셈 결과는 소수점 아래가 길게 나옵니다. 값을 원하는 자릿수로 반올림하는 함수가 있습니다.',
      'ROUND는 반올림할 값과 남길 소수 자릿수, 두 가지를 받습니다.',
      '=ROUND(계산식, 자릿수) 모양입니다. 계산식은 판매량 칸 ÷ 평균 재고 칸입니다.',
      '=ROUND(B2/C2,2) 를 입력합니다. ROUND는 칸에 보이는 모양이 아니라 값 자체를 소수 둘째 자리로 바꿉니다.',
    ],
    explanation:
      'ROUND는 값 자체를 지정한 자릿수로 반올림하는 함수입니다. 이 값을 다른 계산에 쓰면 반올림된 값이 쓰이므로, 계산 결과의 자릿수를 정해야 할 때 사용합니다. 나누는 값은 반드시 칸의 주소로 써서 원본이 바뀌어도 따라오게 합니다.',
    recommendedSolution: {
      steps: ['D2 칸을 선택한다', '=ROUND(B2/C2,2) 를 입력한다'],
      formula: '=ROUND(B2/C2,2)',
    },
    completionCriteria: 'D2가 B2÷C2를 소수 둘째 자리로 ROUND한다.',
  },
  {
    id: 'PRB-L03-CONCAT-01',
    courseId: 'level-3',
    moduleId: 'MOD-L03-12',
    difficulty: 'beginner',
    title: '금액 뒤에 단위를 붙인 글자 만들기',
    goal: '교통비 금액(B2) 뒤에 "원"을 이어 붙인 글자를 C2에 만드세요. 예: 12500원',
    conditions: [
      '원래 금액 칸(B열)은 숫자로 그대로 둡니다.',
      '글자와 숫자는 & 로 이어 붙입니다(함수 이름을 몰라도 됩니다).',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['항목', '금액', '단위 포함 글자'],
            ['교통비', 12500],
            ['식비', 34000],
            ['문구류', 8700],
          ],
          readOnlyRanges: ['A1:B4', 'C1'],
        },
      },
    },
    allowedActions: ['ENTER_FORMULA'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'C2',
      canonicalFormula: '=B2&"원"',
      expectedResult: '12500원',
      mode: 'ALLOW_EQUIVALENT',
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'B2:B4', value: 1 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B4' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B4', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '12500원',
        feedback:
          '완성된 글자를 직접 입력하셨습니다. 금액이 바뀌면 글자도 바뀌어야 하니 금액 칸을 가리키는 수식으로 만드세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=B3&"원"',
        feedback: '다른 항목(식비)의 금액을 가리킵니다. 교통비가 있는 줄의 금액 칸인지 확인하세요.',
      },
    ],
    hints: [
      '숫자 칸은 그대로 두고, 옆 칸에 "숫자 + 글자"를 이어 붙인 결과를 만듭니다.',
      '글자는 큰따옴표(")로 감싸고, 칸의 값과 글자 사이를 & 로 연결합니다.',
      '=칸주소&"글자" 모양입니다.',
      '=B2&"원" 을 입력합니다. B2는 숫자 그대로 남고, C2에는 12500원 이라는 글자가 만들어집니다.',
    ],
    explanation:
      '& 는 두 값을 이어 붙여 글자로 만듭니다. 원본 숫자를 바꾸지 않고 보고서용 표시 칸만 따로 만들면, 계산에는 숫자 칸을 그대로 쓸 수 있습니다. 단, 이어 붙인 결과는 글자라서 더하기에는 쓸 수 없습니다.',
    recommendedSolution: {
      steps: ['C2 칸을 선택한다', '=B2&"원" 을 입력한다'],
      formula: '=B2&"원"',
    },
    completionCriteria: 'C2가 B2의 값 뒤에 "원"을 이어 붙인 글자다.',
  },
];

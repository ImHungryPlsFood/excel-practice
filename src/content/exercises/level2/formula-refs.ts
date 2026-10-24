import type { ProblemDefinitionInput } from '@/types/problem.schema';

/* Level 2 문제 3개 (CARD-04D): 사칙연산과 우선순위, 상대 참조, 절대 참조. 모든 이름·숫자는 가상 데이터다. */
export const problems: ProblemDefinitionInput[] = [
  {
    id: 'PRB-L02-ARITH-01',
    courseId: 'level-2',
    moduleId: 'MOD-L02-01',
    difficulty: 'beginner',
    title: '쿠폰을 적용한 결제 금액',
    goal: '분식집 주문서의 결제 금액(B5)을 구하세요. 결제 금액은 (단가 × 수량) − 쿠폰 할인입니다.',
    conditions: [
      '곱셈을 먼저 하고 쿠폰 할인을 뺍니다.',
      '숫자를 수식에 직접 쓰지 않고 칸 주소로 계산합니다.',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['주문 내역', '값'],
            ['단가', 3500],
            ['수량', 4],
            ['쿠폰 할인', 2000],
            ['결제 금액', null],
          ],
          readOnlyRanges: ['A1:B4', 'A5'],
        },
      },
    },
    allowedActions: ['ENTER_FORMULA'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'B5',
      canonicalFormula: '=B2*B3-B4',
      expectedResult: 12000,
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
        input: '12000',
        feedback:
          '계산 결과를 직접 입력하셨습니다. 단가나 수량이 바뀌면 결제 금액도 바뀌어야 하니 칸 주소로 계산하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=B2*B3-B3',
        feedback: '빼는 칸이 수량입니다. 쿠폰 할인이 적힌 칸의 주소를 확인하세요.',
      },
      {
        diagnosis: 'DATA_DEPENDENT',
        input: '=B2*B3-2000',
        feedback:
          '쿠폰 할인을 숫자 2000으로 직접 적으셨습니다. 지금은 맞지만 쿠폰 금액이 바뀌면 틀립니다. 그 칸의 주소를 쓰세요.',
      },
    ],
    hints: [
      '곱셈과 뺄셈이 섞인 식은 곱셈이 먼저 계산됩니다. 어떤 순서로 계산해야 하는지 말로 먼저 적어 보세요.',
      '단가 칸, 수량 칸, 쿠폰 할인 칸이 필요합니다. 모두 B열에 있습니다.',
      '=칸*칸-칸 모양입니다. 곱셈이 먼저라 괄호는 없어도 됩니다.',
      '=B2*B3-B4 를 입력합니다. 단가×수량으로 합계를 먼저 만들고 거기서 쿠폰 할인을 뺍니다. 괄호로 쿠폰까지 묶어 곱하면 안 됩니다.',
    ],
    explanation:
      '수식은 곱셈·나눗셈을 먼저, 덧셈·뺄셈을 나중에 계산합니다. 숫자 대신 칸 주소를 쓰면 쿠폰 금액이나 수량이 바뀌어도 결제 금액이 자동으로 다시 계산됩니다.',
    recommendedSolution: {
      steps: ['B5 칸을 선택한다', '=B2*B3-B4 를 입력한다'],
      formula: '=B2*B3-B4',
    },
    completionCriteria: 'B5가 B2*B3-B4 와 같은 결과를 칸 참조로 계산한다.',
  },
  {
    id: 'PRB-L02-REL-01',
    courseId: 'level-2',
    moduleId: 'MOD-L02-01',
    difficulty: 'beginner',
    title: '수식을 옆 열로 복사하기',
    goal: 'B7의 합계 수식을 오른쪽으로 복사해 3월 합계(D7)까지 완성하세요.',
    conditions: [
      'D7에 직접 새 수식을 쓰지 않고 B7의 수식을 복사하거나 채웁니다.',
      '부서별 지출(A1:D6)은 고칠 수 없습니다.',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['부서', '1월', '2월', '3월'],
            ['기획', 320, 295, 340],
            ['디자인', 410, 380, 455],
            ['개발', 780, 820, 795],
            ['운영', 260, 275, 240],
            ['총무', 150, 165, 130],
            ['합계', '=SUM(B2:B6)'],
          ],
          readOnlyRanges: ['A1:D6', 'A7'],
        },
      },
    },
    allowedActions: ['AUTOFILL', 'COPY_PASTE'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'D7',
      canonicalFormula: '=SUM(D2:D6)',
      expectedResult: 1960,
      mode: 'REQUIRE_FUNCTION',
      requiredFunctions: ['SUM'],
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'D2:D6', value: 10 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'D2:D6' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'D2:D6', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '1960',
        feedback:
          '합계 숫자를 직접 입력하셨습니다. 지출이 바뀌면 합계도 바뀌어야 하니 B7의 수식을 복사해 만드세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=SUM(B2:B6)',
        feedback:
          '1월 열의 합계가 그대로 들어 있습니다. 수식을 오른쪽으로 복사하면 열 문자도 따라 움직입니다. 이 칸이 몇 월의 합계인지 확인하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=SUM(D2:D5)',
        feedback: '3월 열이 맞지만 마지막 부서(총무)가 범위에서 빠졌습니다.',
      },
    ],
    hints: [
      '같은 계산을 옆 열에도 해야 할 때는 수식을 다시 쓰지 않고 복사합니다.',
      'B7을 복사해서 C7:D7에 붙여넣거나, B7의 채우기 핸들을 오른쪽으로 끕니다.',
      '오른쪽으로 한 칸 움직일 때마다 수식 속 열 문자도 한 칸씩 따라 움직입니다(상대 참조).',
      'B7의 =SUM(B2:B6) 을 D7까지 복사하면 D7은 =SUM(D2:D6) 이 됩니다.',
    ],
    explanation:
      '복사한 수식의 칸 주소는 복사한 방향과 거리만큼 같이 움직입니다. 이것이 상대 참조이고, 그래서 한 열의 합계를 만들면 나머지 열은 복사만으로 완성됩니다.',
    recommendedSolution: {
      steps: [
        'B7을 선택한다',
        '채우기 핸들을 D7까지 오른쪽으로 끈다',
        'D7이 =SUM(D2:D6) 인지 확인한다',
      ],
      formula: '=SUM(D2:D6)',
    },
    completionCriteria: 'D7이 3월 열(D2:D6)의 합계를 SUM으로 구한다.',
  },
  {
    id: 'PRB-L02-ABS-01',
    courseId: 'level-2',
    moduleId: 'MOD-L02-02',
    difficulty: 'intermediate',
    title: '전체 예산에서 차지하는 비율',
    goal: 'C2에 기획팀 예산이 전체 예산(B6)에서 차지하는 비율을 구하세요. 이 수식을 아래 부서에도 그대로 채울 수 있어야 합니다.',
    conditions: [
      '수식을 아래로 채웠을 때 전체 예산 칸(B6)이 계속 고정되어야 합니다.',
      '예산 표(A1:C6)는 고칠 수 없지만 C3:C5는 채워서 확인해 볼 수 있습니다.',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['부서', '예산', '비율'],
            ['기획', 1850],
            ['디자인', 1275],
            ['개발', 940],
            ['운영', 1135],
            ['전체', '=SUM(B2:B5)'],
          ],
          readOnlyRanges: ['A1:C1', 'A2:B6'],
        },
      },
    },
    allowedActions: ['ENTER_FORMULA', 'AUTOFILL', 'COPY_PASTE'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'C2',
      canonicalFormula: '=B2/$B$6',
      expectedResult: 0.35576923076923078,
      mode: 'ALLOW_EQUIVALENT',
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'B2:B5', value: 25 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B5' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B5', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '0.356',
        feedback:
          '비율을 직접 입력하셨습니다. 예산이 바뀌면 비율도 바뀌어야 하니 나눗셈 수식으로 만드세요.',
      },
      {
        diagnosis: 'MISSING_ABSOLUTE_REF',
        input: '=B2/B6',
        feedback:
          '이 칸만 보면 맞지만, 아래로 채우면 나누는 칸(B6)도 B7, B8로 내려가 오류나 엉뚱한 값이 됩니다. 전체 예산 칸은 움직이지 않도록 고정해야 합니다.',
      },
      {
        diagnosis: 'DATA_DEPENDENT',
        input: '=B2/5200',
        feedback:
          '전체 예산을 숫자 5200으로 직접 적으셨습니다. 부서 예산이 바뀌면 전체 값이 달라져 틀립니다. 합계 칸을 가리키되 아래로 채워도 움직이지 않게 하세요.',
      },
    ],
    hints: [
      '각 부서의 예산을 같은 전체 예산으로 나눕니다. 아래로 채울 때 나누는 칸이 움직이면 안 됩니다.',
      '칸 주소의 열 문자와 행 번호 앞에 $ 를 붙이면 채우거나 복사해도 그 부분이 고정됩니다. F4 키로 바꿀 수 있습니다.',
      '=기획예산칸/$열$행 모양입니다. 나뉘는 값(B2)은 줄을 따라 내려가야 하고, 나누는 값(전체)은 고정해야 합니다.',
      '=B2/$B$6 을 입력합니다. 아래로 채우면 B3/$B$6, B4/$B$6 … 으로 나뉘는 값만 내려갑니다.',
    ],
    explanation:
      '$ 가 붙은 주소는 절대 참조라서 복사하거나 채워도 바뀌지 않습니다. 합계처럼 모든 줄이 함께 쓰는 값은 절대 참조로 고정하고, 줄마다 달라지는 값은 상대 참조로 둡니다.',
    recommendedSolution: {
      steps: [
        'C2 칸에 =B2/ 까지 입력한다',
        'B6을 입력한 뒤 F4 키를 눌러 $B$6 으로 바꾼다',
        'C2의 채우기 핸들을 C5까지 끌어 확인한다',
      ],
      formula: '=B2/$B$6',
    },
    completionCriteria: 'C2가 B2를 전체 예산 칸(B6)으로 나누고, 채워도 B6이 고정된다.',
  },
];

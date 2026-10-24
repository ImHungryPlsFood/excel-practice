import type { ProblemDefinitionInput } from '@/types/problem.schema';

/*
 * Level 0 문제 3개 (CARD-04D). 모든 이름·숫자는 가상 데이터다.
 * 셀 선택·입력·채우기는 한 칸 수식 채점이 가능한 형태(주소로 가져오기, 범위 합계, 채우기 결과)로 출제한다.
 */
export const problems: ProblemDefinitionInput[] = [
  {
    id: 'PRB-L00-REF-01',
    courseId: 'level-0',
    moduleId: 'MOD-L00-01',
    difficulty: 'intro',
    title: '표에서 칸 하나 가져오기',
    goal: '도서관 대출 표에서 "과학" 분야의 3주 차 대출 권수를 B6 칸에 가져오세요.',
    conditions: [
      '숫자를 눈으로 읽어 직접 입력하지 않습니다.',
      '표의 원본 칸(A1:E4)은 고칠 수 없습니다.',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['분야', '1주', '2주', '3주', '4주'],
            ['소설', 42, 38, 51, 47],
            ['과학', 17, 22, 19, 25],
            ['역사', 9, 14, 11, 16],
            [null, null, null, null, null],
            ['과학 3주 차', null],
          ],
          readOnlyRanges: ['A1:E4', 'A6'],
        },
      },
    },
    allowedActions: ['ENTER_VALUE', 'ENTER_FORMULA'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'B6',
      canonicalFormula: '=D3',
      expectedResult: 19,
      mode: 'ALLOW_EQUIVALENT',
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'D2:D4', value: 1 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:E4' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'D2:D4', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '19',
        feedback:
          '표를 보고 숫자를 직접 입력하셨습니다. 표의 값이 바뀌면 이 칸도 같이 바뀌어야 하므로, = 뒤에 가져올 칸의 주소를 쓰세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=D2',
        feedback:
          '다른 분야의 칸을 가져왔습니다. 열(몇 주 차인지)과 행(어떤 분야인지)이 만나는 칸의 주소를 다시 찾아보세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=C3',
        feedback:
          '분야는 맞지만 다른 주 차의 칸입니다. 3주 차가 어느 열에 있는지 머리글을 확인하세요.',
      },
    ],
    hints: [
      '셀 주소는 열 문자와 행 번호를 이어서 씁니다. 먼저 "과학"이 몇 번째 행인지, "3주"가 어느 열인지 찾아보세요.',
      '머리글 "3주"의 열과 "과학"의 행이 만나는 칸이 가져올 칸입니다.',
      '=을 먼저 쓰고 그 칸의 주소를 이어 씁니다. 형태는 =열문자행번호 입니다.',
      '"3주"는 D열, "과학"은 3행이므로 B6에 =D3 을 입력합니다. 주소를 쓰면 표의 값이 바뀌어도 이 칸이 따라 바뀝니다.',
    ],
    explanation:
      '수식은 =로 시작하고, 칸의 주소를 쓰면 그 칸의 값을 가져옵니다. 숫자를 직접 적으면 표가 바뀌어도 그대로라서 보고서가 틀려질 수 있습니다.',
    recommendedSolution: {
      steps: ['B6 칸을 선택한다', '=D3 을 입력하고 Enter를 누른다'],
      formula: '=D3',
      requiredActions: ['ENTER_FORMULA'],
    },
    completionCriteria: 'B6이 D3 칸을 참조해 과학 3주 차 대출 권수를 보여 준다.',
  },
  {
    id: 'PRB-L00-RANGE-01',
    courseId: 'level-0',
    moduleId: 'MOD-L00-02',
    difficulty: 'intro',
    title: '가로로 놓인 구간 선택하기',
    goal: '서윤 학생이 수요일부터 금요일까지 출석한 날 수를 B8 칸에 구하세요. (출석 1, 결석 0)',
    conditions: ['수·목·금 칸만 더합니다.', '출석표(A1:F5)는 고칠 수 없습니다.'],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['이름', '월', '화', '수', '목', '금'],
            ['하준', 1, 1, 1, 0, 1],
            ['서윤', 1, 1, 0, 1, 1],
            ['도현', 0, 1, 1, 1, 1],
            ['지아', 1, 0, 1, 1, 0],
            [null],
            [null],
            ['서윤 수~금 출석'],
          ],
          readOnlyRanges: ['A1:F5', 'A8'],
        },
      },
    },
    allowedActions: ['ENTER_VALUE', 'ENTER_FORMULA'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'B8',
      canonicalFormula: '=SUM(D3:F3)',
      expectedResult: 2,
      mode: 'REQUIRE_FUNCTION',
      requiredFunctions: ['SUM'],
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'D3:F3', value: 1 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:F5' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'D3:F3', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '2',
        feedback:
          '결과 숫자를 직접 입력하셨습니다. 출석표가 바뀌어도 맞도록 구간을 선택해 함수로 더하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=SUM(D3:E3)',
        feedback: '범위가 금요일 칸까지 이어지지 않습니다. 끝 칸이 어디인지 다시 확인하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=SUM(C3:F3)',
        feedback: '범위가 수요일보다 한 칸 앞(화요일)에서 시작합니다. 시작 칸을 확인하세요.',
      },
    ],
    hints: [
      '여러 칸을 한 번에 더하려면 범위를 씁니다. 먼저 서윤이 몇 번째 행인지 찾아보세요.',
      '범위는 시작 칸과 끝 칸을 콜론(:)으로 이어 씁니다. 수요일 칸이 시작, 금요일 칸이 끝입니다.',
      '=SUM(시작칸:끝칸) 모양입니다. 서윤은 같은 행에 있으므로 행 번호는 그대로입니다.',
      '서윤은 3행, 수~금은 D~F열이므로 =SUM(D3:F3) 입니다. 출석을 1로 적어 두었으므로 합이 곧 출석한 날 수입니다.',
    ],
    explanation:
      '범위는 시작 칸과 끝 칸 사이의 모든 칸을 뜻합니다. 가로로 놓인 표도 같은 방법으로 선택하고, 행 번호가 같으니 열 문자만 바뀝니다.',
    recommendedSolution: {
      steps: [
        'B8 칸을 선택한다',
        '=SUM( 을 입력한 뒤 D3부터 F3까지 끌어서 선택한다',
        ') 를 닫고 Enter를 누른다',
      ],
      formula: '=SUM(D3:F3)',
      requiredActions: ['ENTER_FORMULA'],
    },
    completionCriteria: 'B8이 서윤의 수·목·금 칸(D3:F3)을 SUM으로 더한다.',
  },
  {
    id: 'PRB-L00-FILL-01',
    courseId: 'level-0',
    moduleId: 'MOD-L00-02',
    difficulty: 'beginner',
    title: '채우기로 금액 열 완성하기',
    goal: 'D2의 수식을 아래로 채워 모든 상품의 금액을 만드세요. 마지막 줄(D7)이 채점 대상입니다.',
    conditions: [
      '각 줄에 수식을 따로 새로 입력하지 않고, D2의 수식을 채우거나 복사해 만듭니다.',
      '단가와 수량(A1:C7)은 고칠 수 없습니다.',
    ],
    initialWorkbook: {
      activeSheet: 'Sheet1',
      sheets: {
        Sheet1: {
          rowCount: 20,
          colCount: 10,
          initialData: [
            ['상품', '단가', '수량', '금액'],
            ['공책', 1200, 15, '=B2*C2'],
            ['연필 세트', 3500, 8],
            ['지우개', 700, 24],
            ['형광펜', 2800, 10],
            ['테이프', 1500, 12],
            ['풀', 950, 20],
          ],
          readOnlyRanges: ['A1:C7', 'D1'],
        },
      },
    },
    allowedActions: ['ENTER_VALUE', 'AUTOFILL', 'COPY_PASTE'],
    grading: {
      targetSheet: 'Sheet1',
      targetCell: 'D7',
      canonicalFormula: '=B7*C7',
      expectedResult: 19000,
      mode: 'ALLOW_EQUIVALENT',
      perturbations: [
        { kind: 'ADD_SCALAR', targetRange: 'C2:C7', value: 1 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:C7' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'C2:C7', value: 2 },
      ],
    },
    misconceptions: [
      {
        diagnosis: 'HARDCODED_VALUE',
        input: '19000',
        feedback:
          '계산한 값을 직접 입력하셨습니다. 단가나 수량이 바뀌면 금액도 바뀌어야 하니 수식을 채워 만드세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=B2*C2',
        feedback:
          '첫 줄의 수식이 그대로 들어 있습니다. 채우거나 복사하면 줄이 바뀔 때 참조하는 칸도 한 줄씩 따라 내려옵니다. 이 칸이 몇 번째 줄을 계산하는지 확인하세요.',
      },
      {
        diagnosis: 'INCOMPLETE_RANGE',
        input: '=B7*C2',
        feedback:
          '단가는 이 줄(7행)인데 수량은 첫 줄(2행)을 가리킵니다. 두 칸의 줄이 같아야 합니다.',
      },
    ],
    hints: [
      '같은 계산을 여러 줄에 반복할 때는 한 줄을 만들고 아래로 채우면 됩니다.',
      'D2 칸을 선택하면 오른쪽 아래 모서리에 채우기 핸들(작은 네모)이 보입니다. 이것을 아래로 끕니다.',
      '또는 D2를 복사한 뒤 D3:D7을 선택해 붙여넣어도 됩니다. 이때 수식 속 주소가 줄마다 한 칸씩 내려갑니다.',
      'D2의 채우기 핸들을 D7까지 끌면 D7이 =B7*C7 이 됩니다. 상대 참조가 줄을 따라 움직이기 때문입니다.',
    ],
    explanation:
      '채우거나 복사한 수식은 이동한 만큼 참조 칸도 같이 이동합니다(상대 참조). 그래서 한 줄만 만들고 끌어 내리면 모든 줄이 자기 줄의 단가와 수량을 곱합니다.',
    recommendedSolution: {
      steps: [
        'D2 칸을 선택한다',
        '채우기 핸들을 D7까지 아래로 끈다',
        'D7의 수식이 =B7*C7 인지 확인한다',
      ],
      formula: '=B7*C7',
      requiredActions: ['AUTOFILL'],
    },
    alternativeSolutions: [
      {
        description: 'D2를 복사해 D3:D7에 붙여넣는다',
        formula: '=B7*C7',
        requiredActions: ['COPY_PASTE'],
      },
    ],
    completionCriteria: 'D7이 같은 줄의 단가와 수량(B7, C7)을 곱한다.',
  },
];

import { Link } from 'react-router-dom';

import { ProblemWorkspace } from '@/features/learning/components/ProblemWorkspace';
import { ProblemDefinitionSchema, type ProblemDefinition } from '@/types/problem.schema';

/*
 * 개발 전용 문제 풀이 확인 화면 (/dev/problem, CARD-04C).
 * 개발 서버와 성능 측정 빌드(--mode perf)에서만 라우트가 등록된다.
 * 제출 → 피드백 → 힌트 → 재시작·실행 취소 흐름을 실제 시트와 채점기로 E2E 확인하는 용도다.
 * 실제 학습 라우트(/learn/:courseId)는 같은 ProblemWorkspace를 쓴다(CARD-04D).
 * 이 문제는 확인용 데이터일 뿐이며, 화면·채점기 어디에도 문제 ID별 분기는 없다.
 */

const PROBLEM: ProblemDefinition = ProblemDefinitionSchema.parse({
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
      feedback: '합계 범위에 마지막 행이 빠졌습니다.',
    },
  ],
  hints: [
    '여러 칸을 한 번에 더하는 함수를 떠올려 보세요.',
    '금액이 들어 있는 B열의 데이터 범위를 사용합니다.',
    '=함수이름(시작:끝) 모양입니다.',
    '합계 칸에 SUM 함수로 금액 범위 전체를 더합니다. 범위 전체를 더하므로 값이 바뀌어도 합계가 갱신됩니다.',
  ],
  explanation: 'SUM은 범위 안의 숫자를 모두 더합니다. 범위를 쓰면 값이 바뀌어도 합계가 따라옵니다.',
  recommendedSolution: { steps: ['B7을 선택한다', 'SUM 함수로 B2:B6을 더한다'] },
  completionCriteria: 'B7이 B2:B6의 합계를 수식으로 계산한다.',
});

export function ProblemHarnessPage() {
  return (
    <ProblemWorkspace
      problem={PROBLEM}
      header={
        <>
          <h1 className="text-sm font-semibold">문제 풀이 개발 확인 화면</h1>
          <span className="text-xs text-fg-muted">개발 전용 · 확인용 문제</span>
          <Link to="/dashboard" className="ml-auto text-sm text-brand hover:underline">
            나가기
          </Link>
        </>
      }
    />
  );
}

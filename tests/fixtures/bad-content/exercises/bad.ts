import { problems as level0 } from '../../../../src/content/exercises/level0/intro-cells';
import { problems as level3 } from '../../../../src/content/exercises/level3/sum-average';

/*
 * verify-content가 실제로 실패를 잡는지 확인하려고 일부러 틀리게 만든 문제들 (CARD-04E).
 * 테스트 전용이며 src/content에는 넣지 않는다. 진짜 문제를 바탕으로 한 군데씩만 망가뜨린다.
 * 각 문제의 기대 실패는 tests/unit/content/verifyContent.test.ts가 확인한다.
 */

function base(id: string) {
  const found = [...level0, ...level3].find((problem) => problem.id === id);
  if (found === undefined) throw new Error(`바탕 문제가 없습니다: ${id}`);
  return found;
}

const ref = base('PRB-L00-REF-01');
const fill = base('PRB-L00-FILL-01');
const range = base('PRB-L00-RANGE-01');
const average = base('PRB-L03-AVG-01');

const broken = [
  // 풀이(채우기)에 필요한 AUTOFILL을 allowedActions에서 뺐다.
  {
    ...fill,
    id: 'PRB-L00-BADACT-01',
    title: '허용 작업이 풀이와 안 맞는 문제',
    allowedActions: ['COPY_PASTE'],
  },
  // 허용했지만 어떤 풀이에도 쓰이지 않는 작업이 있다.
  {
    ...ref,
    id: 'PRB-L00-BADACT-02',
    title: '쓰이지 않는 허용 작업이 있는 문제',
    allowedActions: ['ENTER_FORMULA', 'INSERT_DELETE_ROW_COLUMN'],
  },
  // 풀이에 필요한 작업을 적지 않았다.
  {
    ...ref,
    id: 'PRB-L00-BADACT-03',
    title: '필요한 작업을 적지 않은 문제',
    recommendedSolution: { steps: ref.recommendedSolution.steps, formula: '=D3' },
  },
  // 대표 오답의 판정 코드가 실제와 다르다(=D2는 데이터에 따라 값이 달라지는 칸이라 다른 판정이 나온다).
  {
    ...ref,
    id: 'PRB-L00-BADMIS-01',
    title: '대표 오답 판정 코드가 틀린 문제',
    misconceptions: ref.misconceptions.map((misconception, index) =>
      index === 1 ? { ...misconception, diagnosis: 'DATA_DEPENDENT' } : misconception,
    ),
  },
  // 함수 사용을 요구하는데 기준 정답이 그 함수를 쓰지 않는다.
  {
    ...range,
    id: 'PRB-L00-BADPAS-01',
    title: '기준 정답이 채점을 통과하지 못하는 문제',
    grading: { ...range.grading, requiredFunctions: ['AVERAGE'] },
  },
  // expectedResult가 기준 정답의 계산 결과와 다르다.
  {
    ...ref,
    id: 'PRB-L00-BADVAL-01',
    title: '기대 결과가 틀린 문제',
    grading: { ...ref.grading, expectedResult: 999 },
  },
  // 데이터 때문에 소수가 되는 값을 &로 잇는다(AVERAGE 결과 86.333...). 정적 검사로는 못 잡는다.
  {
    ...average,
    id: 'PRB-L03-BADCAT-01',
    title: '소수를 글자로 잇는 문제',
    grading: {
      ...average.grading,
      canonicalFormula: '=AVERAGE(B3:E3)&"점"',
      expectedResult: '86.3333333333333점',
      mode: 'ALLOW_EQUIVALENT',
      requiredFunctions: [],
    },
    recommendedSolution: { ...average.recommendedSolution, formula: '=AVERAGE(B3:E3)&"점"' },
  },
  // FILTER에 일치하는 값이 없다.
  {
    ...ref,
    id: 'PRB-L00-BADFLT-01',
    title: 'FILTER 결과가 비는 문제',
    grading: {
      ...ref.grading,
      canonicalFormula: '=FILTER(B2:B4,B2:B4>1000)',
      expectedResult: 0,
    },
    recommendedSolution: { ...ref.recommendedSolution, formula: '=FILTER(B2:B4,B2:B4>1000)' },
  },
  // UNIQUE 대상 범위(B3:E3) 안에 빈 셀(D3)이 있다.
  {
    ...average,
    id: 'PRB-L03-BADUNQ-01',
    title: 'UNIQUE 대상에 빈 셀이 있는 문제',
    grading: {
      ...average.grading,
      canonicalFormula: '=UNIQUE(B3:E3)',
      expectedResult: 88,
      mode: 'ALLOW_EQUIVALENT',
      requiredFunctions: [],
    },
    recommendedSolution: { ...average.recommendedSolution, formula: '=UNIQUE(B3:E3)' },
  },
];

/** 문제를 이어 줄 코스·모듈은 레벨마다 하나씩 쓴다. */
export const problems = broken.map((problem) => ({
  ...problem,
  moduleId: problem.courseId === 'level-0' ? 'MOD-L00-01' : 'MOD-L03-01',
}));

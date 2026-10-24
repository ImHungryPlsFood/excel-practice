import { describe, expect, it, vi } from 'vitest';

import {
  gradeSubmission,
  type ScorerDeps,
  type SheetContents,
} from '@/engine/grading/PerturbationScorer';
import { compareStructure } from '@/engine/grading/diagnostics/misconceptionClassifier';
import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import type { CellScalar } from '@/engine/spreadsheet/FormulaEngineAdapter';
import { positionOfAddress } from '@/engine/spreadsheet/operations/referenceShift';
import {
  ProblemDefinitionSchema,
  type ProblemDefinition,
  type ProblemDefinitionInput,
} from '@/types/problem.schema';

import {
  buildAbsoluteRefProblem,
  buildDataDependentProblem,
  buildDecimalRoundProblem,
  buildProblem,
} from './problemFixtures';

const parse = (input: ProblemDefinitionInput): ProblemDefinition =>
  ProblemDefinitionSchema.parse(input);

/** 문제의 시작 데이터에 학생 입력을 대상 셀에 넣은 작업 시트 */
function sheetsWith(problem: ProblemDefinition, content: CellScalar | undefined): SheetContents {
  const sheets: Record<string, CellScalar[][]> = {};
  for (const [name, sheet] of Object.entries(problem.initialWorkbook.sheets)) {
    sheets[name] = sheet.initialData.map((row) => [...row]);
  }
  if (content !== undefined) {
    const pos = positionOfAddress(problem.grading.targetCell);
    if (pos === null) throw new Error('bad target');
    const grid = sheets[problem.grading.targetSheet] ?? [];
    while (grid.length <= pos.row) grid.push([]);
    const line = grid[pos.row] ?? [];
    while (line.length <= pos.col) line.push(null);
    line[pos.col] = content;
    grid[pos.row] = line;
    sheets[problem.grading.targetSheet] = grid;
  }
  return sheets;
}

const grade = (problem: ProblemDefinition, content: CellScalar | undefined, deps?: ScorerDeps) =>
  gradeSubmission(problem, { sheets: sheetsWith(problem, content) }, deps);

/** 자유 해결 문제로 바꾼 같은 문제 (함수 사용 강제 없음) */
function allowEquivalent(input: ProblemDefinitionInput): ProblemDefinition {
  const parsed = parse(input);
  return parse({
    ...input,
    grading: { ...parsed.grading, mode: 'ALLOW_EQUIVALENT', requiredFunctions: [] },
  });
}

const fixtures: [string, ProblemDefinitionInput][] = [
  ['합계', buildProblem()],
  ['합계(데이터 의존 오답 포함)', buildDataDependentProblem()],
  ['소수 평균', buildDecimalRoundProblem()],
  ['절대 참조', buildAbsoluteRefProblem()],
];

describe('대표 오답 픽스처는 정해진 판정 코드로 판정된다 (R-09.17~19, Q-02)', () => {
  for (const [name, input] of fixtures) {
    const problem = parse(input);
    it.each(problem.misconceptions.map((m) => [m.diagnosis, m.input, m.feedback] as const))(
      `${name}: %s ← %s`,
      async (diagnosis, inputText, feedback) => {
        const result = await grade(problem, inputText);
        expect(result.diagnosis).toBe(diagnosis);
        expect(result.outcome).toBe('DIAGNOSED');
        expect(result.passed).toBe(false);
        expect(result.reason).toContain(feedback);
        expect(result.reason.length).toBeGreaterThan(feedback.length);
      },
    );
  }
});

describe('정답 판정 (R-09.15, R-09.16)', () => {
  it.each(fixtures)('%s: 기준 정답 수식은 PASS', async (_name, input) => {
    const problem = parse(input);
    const result = await grade(problem, problem.grading.canonicalFormula);
    expect(result).toMatchObject({ diagnosis: 'PASS', passed: true, outcome: 'DIAGNOSED' });
    expect(result.datasets.every((d) => d.matched)).toBe(true);
    expect(result.datasets).toHaveLength(1 + problem.grading.perturbations.length);
  });

  it('공백·대소문자만 다른 정답도 PASS', async () => {
    const result = await grade(parse(buildProblem()), '= sum( b2 : b6 )');
    expect(result.diagnosis).toBe('PASS');
  });

  it('다른 수식으로 같은 결과(교란 데이터 포함)면 ALTERNATE_FORMULA_PASS', async () => {
    const result = await grade(parse(buildProblem()), '=SUM(B2:B3,B4:B6)');
    expect(result).toMatchObject({ diagnosis: 'ALTERNATE_FORMULA_PASS', passed: true });
  });

  it('자유 해결 문제는 함수를 쓰지 않은 대체 풀이도 허용', async () => {
    const result = await grade(allowEquivalent(buildProblem()), '=B2+B3+B4+B5+B6');
    expect(result).toMatchObject({ diagnosis: 'ALTERNATE_FORMULA_PASS', passed: true });
  });

  it('소수 데이터에서 같은 값을 내는 다른 수식도 통과', async () => {
    const problem = allowEquivalent(buildDecimalRoundProblem());
    const result = await grade(problem, '=ROUND(SUM(B2:B6)/5,2)');
    expect(result).toMatchObject({ diagnosis: 'ALTERNATE_FORMULA_PASS', passed: true });
  });
});

describe('함수 규칙 (§9.1: 함수를 배우는 문제는 그 함수를 쓰게 한다)', () => {
  it('결과는 맞아도 필수 함수를 쓰지 않으면 통과하지 못한다', async () => {
    const result = await grade(parse(buildProblem()), '=B2+B3+B4+B5+B6');
    expect(result).toMatchObject({
      passed: false,
      diagnosis: null,
      outcome: 'REQUIRED_FUNCTION_MISSING',
    });
    expect(result.reason).toContain('SUM');
  });

  it('금지 함수를 쓰면 통과하지 못한다', async () => {
    const base = parse(buildProblem());
    const problem = parse({
      ...buildProblem(),
      grading: {
        ...base.grading,
        mode: 'ALLOW_EQUIVALENT',
        requiredFunctions: [],
        forbiddenFunctions: ['SUBTOTAL'],
      },
    });
    const result = await grade(problem, '=SUBTOTAL(9,B2:B6)');
    expect(result).toMatchObject({ passed: false, outcome: 'FORBIDDEN_FUNCTION_USED' });
  });
});

describe('다섯 경우와 참조 오류를 구분한다 (§9.1, Q-02)', () => {
  const problem = parse(buildProblem());

  it('숫자를 직접 입력해 우연히 같은 결과 → HARDCODED_VALUE, 근거는 교란에서 드러난다', async () => {
    const result = await grade(problem, 850);
    expect(result.diagnosis).toBe('HARDCODED_VALUE');
    expect(result.datasets[0]?.matched).toBe(true); // 지금 데이터에서는 일치
    expect(result.datasets.slice(1).some((d) => !d.matched)).toBe(true); // 교란에서 드러남
    expect(result.reason).not.toContain('지금 값도');
  });

  it('숫자만으로 만든 수식도 HARDCODED_VALUE', async () => {
    const result = await grade(problem, '=100+250+80+300+120');
    expect(result.diagnosis).toBe('HARDCODED_VALUE');
  });

  it('값이 틀린 상수도 HARDCODED_VALUE이며 값도 다르다고 알려 준다', async () => {
    const result = await grade(problem, 800);
    expect(result.diagnosis).toBe('HARDCODED_VALUE');
    expect(result.reason).toContain('지금 값도');
  });

  it('범위가 잘못된 수식 → INCOMPLETE_RANGE, 빠진 칸을 알려 준다', async () => {
    const result = await grade(problem, '=SUM(B2:B5)');
    expect(result.diagnosis).toBe('INCOMPLETE_RANGE');
    expect(result.reason).toContain('빠진 칸: B6');
  });

  it('범위가 넘쳐도 결과가 모든 데이터에서 같으면(머리글 B1은 합계에 영향 없음) 통과', async () => {
    const result = await grade(problem, '=SUM(B1:B6)');
    expect(result.diagnosis).toBe('ALTERNATE_FORMULA_PASS');
    expect(result.passed).toBe(true);
  });

  it('필요 이상으로 넓은 범위는 통과하되 별도 필드로 조언한다 (§9.1 범위가 잘못된 경우)', async () => {
    const result = await grade(problem, '=SUM(B1:B6)');
    expect(result.diagnosis).toBe('ALTERNATE_FORMULA_PASS');
    expect(result.advice).toContain('B1');
    expect(result.advice).toContain('COUNTA');
    expect(result.reason).toContain(result.advice ?? '');
  });

  it('값이 없는 빈 칸까지 넓힌 범위도 통과하고 넓다고 조언한다', async () => {
    const result = await grade(allowEquivalent(buildProblem()), '=SUM(B2:C6)');
    expect(result.passed).toBe(true);
    expect(result.advice).toContain('C2');
  });

  it('정답 범위 그대로면 조언이 없고, 오답에도 조언이 붙지 않는다', async () => {
    expect((await grade(problem, '=SUM(B2:B6)')).advice).toBeNull();
    expect((await grade(problem, '=SUM(B2:B5)')).advice).toBeNull();
    expect((await grade(problem, 850)).advice).toBeNull();
  });

  it('범위 비교는 빠진 칸과 넘치는 칸을 각각 찾아낸다', () => {
    const comparison = compareStructure('=SUM(B1:B5)', '=SUM(B2:B6)', 'Sheet1');
    expect(comparison.referencesDiffer).toBe(true);
    expect(comparison.missingCells).toEqual(['B6']);
    expect(comparison.extraCells).toEqual(['B1']);
  });

  it('현재 데이터에서만 맞는 수식 → DATA_DEPENDENT, 어떤 변형에서 틀리는지 알려 준다', async () => {
    const result = await grade(problem, '=SUM(B2:B5)+120');
    expect(result.diagnosis).toBe('DATA_DEPENDENT');
    expect(result.datasets[0]?.matched).toBe(true);
    expect(result.datasets.some((d) => !d.matched)).toBe(true);
    expect(result.reason).toMatch(/더했을 때|배로 바꿨을 때|끼워 넣었을 때/);
  });

  it('절대 참조 누락 → MISSING_ABSOLUTE_REF (제자리 값은 모든 데이터에서 맞다)', async () => {
    const result = await grade(parse(buildAbsoluteRefProblem()), '=B2*E1');
    expect(result.diagnosis).toBe('MISSING_ABSOLUTE_REF');
    expect(result.datasets.every((d) => d.matched)).toBe(true);
    expect(result.reason).toContain('F4');
  });

  it('열만 고정한 수식($E1)도 아래로 복사하면 틀어지므로 MISSING_ABSOLUTE_REF', async () => {
    const result = await grade(parse(buildAbsoluteRefProblem()), '=B2*$E1');
    expect(result.diagnosis).toBe('MISSING_ABSOLUTE_REF');
  });

  it('정답과 같은 고정($E$1)은 PASS', async () => {
    const result = await grade(parse(buildAbsoluteRefProblem()), '=B2*$E$1');
    expect(result.diagnosis).toBe('PASS');
  });
});

describe('진단 코드가 없는 결과', () => {
  const problem = parse(buildProblem());

  it('빈 셀 → NOT_ATTEMPTED', async () => {
    for (const content of [undefined, null, '', '   ']) {
      const result = await grade(problem, content);
      expect(result).toMatchObject({ passed: false, diagnosis: null, outcome: 'NOT_ATTEMPTED' });
      expect(result.reason).toContain('B7');
    }
  });

  it('오류 값 → ERROR_VALUE', async () => {
    const result = await grade(problem, '=1/0');
    expect(result).toMatchObject({ passed: false, diagnosis: null, outcome: 'ERROR_VALUE' });
    expect(result.reason).toContain('#DIV/0!');
  });

  it('분류할 수 없는 오답 → WRONG_RESULT, 정답 값을 알려 주지 않는다', async () => {
    const result = await grade(problem, '=MAX(B2:B6)');
    expect(result).toMatchObject({ passed: false, diagnosis: null, outcome: 'WRONG_RESULT' });
    expect(result.reason).not.toContain('850');
  });
});

describe('교란 변형이 판정에 쓰인다 (Q-02 변형 A·B·C)', () => {
  it('데이터셋은 기본 + 변형 3종이며 각 변형으로 기대값이 다시 계산된다', async () => {
    const result = await grade(parse(buildProblem()), '=SUM(B2:B6)');
    expect(result.datasets.map((d) => [d.kind, d.expectedValue])).toEqual([
      ['BASE', 850],
      ['ADD_SCALAR', 900],
      ['INSERT_BLANK_ROW', 850],
      ['MULTIPLY_SCALAR', 1700],
    ]);
  });

  it('소수 데이터도 15자리 기준으로 비교한다', async () => {
    const problem = parse(buildDecimalRoundProblem());
    const result = await grade(problem, problem.grading.canonicalFormula);
    expect(result.datasets[0]?.expectedValue).toBe(10.01);
    expect(result.passed).toBe(true);
  });
});

describe('학생 시트를 바꾸지 않고, 정답을 하드코딩하지 않는다 (R-09.20, R-09.25, 금지규칙 2)', () => {
  const deepFreeze = <T>(value: T): T => {
    if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  };

  it('동결한 입력도 채점할 수 있고 호출 뒤에도 그대로다', async () => {
    const problem = parse(buildProblem());
    const sheets = deepFreeze(sheetsWith(problem, '=SUM(B2:B5)'));
    const before = JSON.stringify(sheets);
    await gradeSubmission(problem, { sheets });
    expect(JSON.stringify(sheets)).toBe(before);
  });

  it('만든 어댑터를 모두 한 번씩 destroy한다', async () => {
    const problem = parse(buildProblem());
    const spies: ReturnType<typeof vi.spyOn>[] = [];
    const createAdapter = () => {
      const adapter = new HyperFormulaAdapter();
      spies.push(vi.spyOn(adapter, 'destroy'));
      return adapter;
    };
    await grade(problem, '=SUM(B2:B5)', { createAdapter });
    expect(spies.length).toBeGreaterThanOrEqual(1 + problem.grading.perturbations.length);
    expect(spies.every((spy) => spy.mock.calls.length === 1)).toBe(true);
  });

  it('같은 입력은 같은 결과', async () => {
    const problem = parse(buildProblem());
    expect(await grade(problem, '=SUM(B2:B5)')).toEqual(await grade(problem, '=SUM(B2:B5)'));
  });

  it('문제 ID와 무관하다: 같은 정의를 다른 ID로 바꿔도 같은 판정', async () => {
    const problem = parse(buildProblem());
    const renamed = parse({ ...buildProblem(), id: 'PRB-L03-SUM-77' });
    for (const input of [850, '=SUM(B2:B5)', '=SUM(B2:B6)', '=SUM(B2:B5)+120']) {
      expect((await grade(renamed, input)).diagnosis).toBe((await grade(problem, input)).diagnosis);
    }
  });

  it('데이터를 바꾼 문제에서는 기준 정답 재계산 결과가 따라간다(기대값을 저장하지 않는다)', async () => {
    const input = buildProblem();
    const sheet = input.initialWorkbook.sheets['Sheet1'];
    const problem = parse({
      ...input,
      initialWorkbook: {
        activeSheet: 'Sheet1',
        sheets: {
          Sheet1: {
            ...sheet,
            initialData: [
              ['항목', '금액'],
              ['A', 1],
              ['B', 2],
              ['C', 3],
              ['D', 4],
              ['E', 5],
            ],
          },
        },
      },
    });
    expect((await grade(problem, '=SUM(B2:B6)')).diagnosis).toBe('PASS');
    expect((await grade(problem, 850)).diagnosis).toBe('HARDCODED_VALUE');
  });
});

describe('모든 결과는 구체적인 이유를 돌려준다 (R-09.23)', () => {
  it.each([
    undefined,
    850,
    '=1/0',
    '=SUM(B2:B5)',
    '=SUM(B2:B6)',
    '=SUM(B2:B5)+120',
    '=MAX(B2:B6)',
    '=B2+B3+B4+B5+B6',
  ])('입력 %s', async (content) => {
    const result = await grade(parse(buildProblem()), content);
    expect(result.reason.trim().length).toBeGreaterThan(10);
  });
});

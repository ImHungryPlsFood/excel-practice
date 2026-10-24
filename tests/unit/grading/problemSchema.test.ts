import { describe, expect, it } from 'vitest';

import {
  ContentLoadError,
  createContentLoader,
  getContentLoader,
  toPublicProblem,
} from '@/engine/grading/problemLoader';
import {
  CourseMetaSchema,
  GRADING_DIAGNOSES,
  ProblemDefinitionSchema,
} from '@/types/problem.schema';

import {
  buildDecimalRoundProblem,
  buildProblem,
  buildProblemWithSheet,
  fixtureCourse,
  sampleMisconceptions,
} from './problemFixtures';

function messages(input: unknown): string[] {
  const result = ProblemDefinitionSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

function grading(patch: Record<string, unknown>) {
  const base = buildProblem();
  return buildProblem({ grading: { ...base.grading, ...patch } as typeof base.grading });
}

describe('ProblemDefinitionSchema', () => {
  it('올바른 문제를 받아들이고 기본값을 채운다', () => {
    const parsed = ProblemDefinitionSchema.parse(buildProblem());
    expect(parsed.examVersion).toBe('standard');
    expect(parsed.scoring).toEqual({ points: 20, hintPenaltyPerStep: 2 });
    expect(parsed.hints).toHaveLength(4);
  });

  it('판정 코드는 §9.1의 다섯 경우와 절대 참조 오류를 담는다', () => {
    expect(GRADING_DIAGNOSES).toEqual(
      expect.arrayContaining([
        'PASS',
        'ALTERNATE_FORMULA_PASS',
        'HARDCODED_VALUE',
        'INCOMPLETE_RANGE',
        'DATA_DEPENDENT',
        'MISSING_ABSOLUTE_REF',
      ]),
    );
  });

  it.each(['goal', 'initialWorkbook', 'allowedActions', 'grading', 'misconceptions', 'hints'])(
    '필수 속성 %s가 없으면 거부한다',
    (key) => {
      const rest = Object.fromEntries(Object.entries(buildProblem()).filter(([k]) => k !== key));
      expect(ProblemDefinitionSchema.safeParse(rest).success).toBe(false);
    },
  );

  it('힌트는 정확히 4단계여야 한다', () => {
    expect(
      ProblemDefinitionSchema.safeParse(buildProblem({ hints: ['a', 'b', 'c'] as never })).success,
    ).toBe(false);
  });

  it('코스·모듈·문제 ID의 레벨이 다르면 거부한다', () => {
    expect(messages(buildProblem({ courseId: 'level-4' })).join()).toContain('레벨');
    expect(messages(buildProblem({ moduleId: 'MOD-L04-SUM' })).join()).toContain('moduleId');
  });

  it('채점 대상 셀이 시트 밖이면 거부한다', () => {
    expect(messages(grading({ targetCell: 'B99' })).join()).toContain('시트 밖');
  });

  it('채점 대상 셀이 수정 금지 범위 안이면 거부한다', () => {
    expect(messages(grading({ targetCell: 'B3' })).join()).toContain('수정 금지');
  });

  it('activeSheet나 채점 시트가 없으면 거부한다', () => {
    const base = buildProblem();
    expect(
      messages(
        buildProblem({ initialWorkbook: { ...base.initialWorkbook, activeSheet: 'X' } }),
      ).join(),
    ).toContain('activeSheet');
    expect(messages(grading({ targetSheet: 'X' })).join()).toContain('채점 대상 시트');
  });

  it('시작 데이터가 시트 크기보다 크면 거부한다', () => {
    expect(messages(buildProblemWithSheet({ rowCount: 3 })).join()).toContain('시작 데이터');
  });

  describe('교란 설정 (Q-02)', () => {
    it('더하기·빈 행 삽입·배율 변형이 모두 있어야 한다', () => {
      const perturbations = [
        { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value: 10 },
        { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value: 5 },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 2 },
      ];
      expect(messages(grading({ perturbations })).join()).toContain('INSERT_BLANK_ROW');
      expect(ProblemDefinitionSchema.safeParse(grading({ perturbations: [] })).success).toBe(false);
    });

    it('소수 값은 데이터의 소수 자릿수를 넘지 못한다', () => {
      const perturbations = [
        { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value: 0.5 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B6' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 2 },
      ];
      expect(messages(grading({ perturbations })).join()).toContain('소수 자릿수');
    });

    it('배율은 정수여야 한다 (소수를 곱하면 자릿수가 늘어난다)', () => {
      const perturbations = [
        { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value: 10 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B6' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 2.5 },
      ];
      expect(ProblemDefinitionSchema.safeParse(grading({ perturbations })).success).toBe(false);
    });

    it('소수 데이터와 ROUND를 쓰는 문제도 교란 3종과 함께 통과한다', () => {
      expect(ProblemDefinitionSchema.safeParse(buildDecimalRoundProblem()).success).toBe(true);
    });

    it('소수 데이터에는 데이터 자릿수 이하의 소수를 더할 수 있다', () => {
      const base = buildDecimalRoundProblem();
      const ok = (value: number) =>
        ProblemDefinitionSchema.safeParse(
          buildDecimalRoundProblem({
            grading: {
              ...base.grading,
              perturbations: [
                { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value },
                { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B6' },
                { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 3 },
              ],
            },
          }),
        ).success;
      expect(ok(0.05)).toBe(true);
      expect(ok(-3)).toBe(true);
      expect(ok(0.125)).toBe(false);
    });

    it.each([
      ['&', '="평균 "&AVERAGE(B2:B6)'],
      ['CONCAT', '=CONCAT("평균 ",AVERAGE(B2:B6))'],
      ['CONCATENATE', '=CONCATENATE("평균 ",B2)'],
      ['TEXTJOIN', '=TEXTJOIN("-",TRUE,B2:B6)'],
      ['TEXT', '=TEXT(AVERAGE(B2:B6),"0.00")'],
    ])('정답 수식이 %s로 숫자를 글자로 바꾸면 소수 데이터 교란을 막는다', (_name, formula) => {
      const problem = buildDecimalRoundProblem({
        grading: { ...buildDecimalRoundProblem().grading, canonicalFormula: formula },
      });
      expect(messages(problem).join()).toContain('글자로 바꾸는데');
    });

    it('글자로 바꾸는 수식도 ROUND로 감싸면 소수 데이터 교란을 허용한다', () => {
      const problem = buildDecimalRoundProblem({
        grading: {
          ...buildDecimalRoundProblem().grading,
          canonicalFormula: '="평균 "&ROUND(AVERAGE(B2:B6),2)',
          expectedResult: '평균 10.01',
        },
      });
      expect(messages(problem)).toEqual([]);
    });

    it('글자로 바꾸는 수식은 정수 데이터 교란을 허용하되 소수는 더할 수 없다', () => {
      const textFormula = '="합계 "&SUM(B2:B6)';
      const base = buildProblem();
      expect(
        messages(grading({ canonicalFormula: textFormula, expectedResult: '합계 850' })),
      ).toEqual([]);
      const withDecimalAdd = grading({
        canonicalFormula: textFormula,
        expectedResult: '합계 850',
        perturbations: [
          { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value: 0.5 },
          ...base.grading.perturbations.slice(1),
        ],
      });
      expect(messages(withDecimalAdd).join()).toContain('소수 자릿수');
    });

    it('숫자가 아닌 셀이 든 범위는 더하기·배율 교란 대상이 될 수 없다', () => {
      const perturbations = [
        { kind: 'ADD_SCALAR', targetRange: 'A1:B6', value: 10 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B6' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 2 },
      ];
      expect(messages(grading({ perturbations })).join()).toContain('숫자가 아닙니다');
    });

    it('교란 범위가 시트 밖이면 거부한다', () => {
      const perturbations = [
        { kind: 'ADD_SCALAR', targetRange: 'B2:B60', value: 10 },
        { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B6' },
        { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 2 },
      ];
      expect(messages(grading({ perturbations })).join()).toContain('시트 밖');
    });
  });

  describe('대표 오답 (Q-03, 9.2)', () => {
    it('오답이 2개 미만이면 거부한다', () => {
      const [first] = sampleMisconceptions;
      expect(
        ProblemDefinitionSchema.safeParse(buildProblem({ misconceptions: [first] })).success,
      ).toBe(false);
    });

    it('서로 다른 판정 코드 2개가 필요하다', () => {
      const [first] = sampleMisconceptions;
      expect(
        messages(buildProblem({ misconceptions: [first, { ...first, input: '900' }] })).join(),
      ).toContain('서로 다른 판정 코드');
    });

    it('통과 판정은 오답으로 쓸 수 없다', () => {
      const [first] = sampleMisconceptions;
      const passing = { diagnosis: 'PASS', input: '=SUM(B2:B6)', feedback: 'x' };
      expect(
        ProblemDefinitionSchema.safeParse(
          buildProblem({ misconceptions: [first, passing] as never }),
        ).success,
      ).toBe(false);
    });

    it('HARDCODED_VALUE는 값, 나머지는 수식이어야 하고 기준 정답과 같을 수 없다', () => {
      const [first, second] = sampleMisconceptions;
      expect(
        messages(buildProblem({ misconceptions: [{ ...first, input: '=850' }, second] })).join(),
      ).toContain('수식이 아닌 값');
      expect(
        messages(buildProblem({ misconceptions: [first, { ...second, input: '5' }] })).join(),
      ).toContain('수식이어야');
      expect(
        messages(
          buildProblem({ misconceptions: [first, { ...second, input: '=sum( B2:B6 )' }] }),
        ).join(),
      ).toContain('기준 정답과 같습니다');
    });

    it('피드백이 비어 있으면 거부한다', () => {
      const [first, second] = sampleMisconceptions;
      expect(
        ProblemDefinitionSchema.safeParse(
          buildProblem({ misconceptions: [{ ...first, feedback: '' }, second] }),
        ).success,
      ).toBe(false);
    });
  });

  describe('채점 규칙과 점수', () => {
    it('기준 정답 수식에 콘텐츠 작성 지침을 적용한다', () => {
      expect(messages(grading({ canonicalFormula: '=LOOKUP(1,B2:B6)' })).join()).toContain(
        'UNSUPPORTED_FUNCTION',
      );
    });

    it('함수 사용을 배우는 문제는 필수 함수가 있어야 한다', () => {
      expect(messages(grading({ requiredFunctions: [] })).join()).toContain('requiredFunctions');
      expect(
        ProblemDefinitionSchema.safeParse(
          grading({ mode: 'ALLOW_EQUIVALENT', requiredFunctions: [] }),
        ).success,
      ).toBe(true);
    });

    it('필수 함수와 금지 함수가 겹치면 거부한다', () => {
      expect(messages(grading({ forbiddenFunctions: ['SUM'] })).join()).toContain('겹칩니다');
    });

    it('힌트 감점 합계가 배점의 절반을 넘으면 거부한다', () => {
      const scoring = { points: 20, hintPenaltyPerStep: 6 };
      expect(messages(buildProblem({ scoring })).join()).toContain('절반');
    });
  });
});

describe('CourseMetaSchema', () => {
  it('올바른 코스를 받아들인다', () => {
    expect(CourseMetaSchema.safeParse(fixtureCourse).success).toBe(true);
  });

  it('다른 레벨 모듈, 중복 ID, 문제 수보다 큰 통과 기준을 거부한다', () => {
    const module = fixtureCourse.modules[0];
    const wrongLevel = { ...fixtureCourse, modules: [{ ...module, id: 'MOD-L04-SUM' }] };
    expect(CourseMetaSchema.safeParse(wrongLevel).success).toBe(false);
    const duplicate = { ...fixtureCourse, modules: [module, module] };
    expect(CourseMetaSchema.safeParse(duplicate).success).toBe(false);
    const tooMany = {
      ...fixtureCourse,
      modules: [{ ...module, completion: { minProblemsPassed: 2, requireTutorial: false } }],
    };
    expect(CourseMetaSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe('콘텐츠 로더', () => {
  const source = (problems: unknown[] = [buildProblem()]) => ({
    courses: { '/c/level3.ts': { course: fixtureCourse } },
    exercises: { '/e/sum.ts': { problems } },
  });

  it('UI 코드를 고치지 않고 콘텐츠만 넘겨 문제를 추가할 수 있다 (R-06.19)', () => {
    const loader = createContentLoader(source());
    expect(loader.loadProblem('PRB-L03-SUM-01').title).toBe('월 매출 합계');
    expect(loader.listProblems('level-3')).toHaveLength(1);
    expect(loader.listProblems('level-4')).toHaveLength(0);
    expect(loader.loadModule('MOD-L03-SUM').courseId).toBe('level-3');
    expect(loader.loadCourse('level-3').modules).toHaveLength(1);
  });

  it('없는 코스·모듈·문제를 조회하면 오류를 던진다', () => {
    const loader = createContentLoader(source());
    expect(() => loader.loadProblem('PRB-L03-NONE')).toThrow('없는 문제');
    expect(() => loader.loadCourse('level-9')).toThrow('없는 코스');
    expect(() => loader.loadModule('MOD-L03-NONE')).toThrow('없는 모듈');
  });

  it('잘못된 문제는 파일과 경로를 알려 주는 오류로 거부한다', () => {
    const bad = { ...buildProblem(), hints: ['a'] };
    expect(() => createContentLoader(source([bad]))).toThrow(ContentLoadError);
    expect(() => createContentLoader(source([bad]))).toThrow(
      /\/e\/sum\.ts \[problems\[0\]\] › hints/,
    );
  });

  it('문제 ID 중복, 모듈에 없는 문제, 없는 문제 참조를 거부한다', () => {
    expect(() => createContentLoader(source([buildProblem(), buildProblem()]))).toThrow('중복');
    expect(() => createContentLoader(source([]))).toThrow('없는 문제');
    const orphan = buildProblem({ id: 'PRB-L03-OTHER-01' });
    expect(() => createContentLoader(source([buildProblem(), orphan]))).toThrow(
      'problemIds에 없습니다',
    );
    const noModule = buildProblem({ moduleId: 'MOD-L03-MISSING' });
    expect(() => createContentLoader(source([noModule]))).toThrow('코스 메타데이터에 없습니다');
  });

  it('export 규칙을 어긴 파일을 알려 준다', () => {
    expect(() => createContentLoader({ courses: { '/c/x.ts': {} }, exercises: {} })).toThrow(
      "'course'",
    );
    expect(() => createContentLoader({ courses: {}, exercises: { '/e/x.ts': {} } })).toThrow(
      "'problems'",
    );
  });

  it('실제 콘텐츠(src/content)가 스키마를 통과한다', () => {
    const loader = getContentLoader();
    expect(loader.loadCourse('level-0').modules.length).toBeGreaterThan(0);
  });
});

describe('toPublicProblem (S-04)', () => {
  it('정답·해설·힌트 본문·교란·오답 예시를 담지 않는다', () => {
    const problem = ProblemDefinitionSchema.parse(buildProblem());
    const serialized = JSON.stringify(toPublicProblem(problem));
    for (const secret of [
      '=SUM(B2:B6)',
      '850',
      'SUM은 범위',
      '마지막 행(B6)',
      '여러 칸을 한 번에',
      'perturbations',
      'canonicalFormula',
      'misconceptions',
      'explanation',
      'alternativeSolutions',
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(toPublicProblem(problem)).toMatchObject({
      id: 'PRB-L03-SUM-01',
      target: { sheet: 'Sheet1', cell: 'B7' },
      hintCount: 4,
    });
  });
});

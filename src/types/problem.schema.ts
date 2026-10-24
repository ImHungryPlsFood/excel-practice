import { z } from 'zod';

import {
  CourseIdSchema,
  levelOfCourseId,
  levelOfModuleId,
  levelOfProblemId,
  ModuleIdSchema,
  ProblemIdSchema,
} from '@/content/contentIds';
import { convertsNumbersToText, lintFormula } from '@/content/contentLint';
import { ENGINE_LIMITS } from '@/engine/spreadsheet/FormulaEngineAdapter';
import { decimalPlaces } from '@/engine/spreadsheet/numberFormat';

import { ExamVersionSchema } from './examVersion';
import { CellAddressSchema, CellValueSchema, RangeAddressSchema } from './tutorial.schema';

/*
 * 문제·모듈·코스 선언형 스키마 (CARD-04A, MASTER_PROMPT §6·§9, TECHNICAL_DESIGN §5).
 * 문제는 학습 엔진과 분리된 콘텐츠다. 문제를 추가하거나 고쳐도 UI 코드를 바꾸지 않는다(R-06.18, R-06.19).
 *
 * MASTER_PROMPT §9 문제 정의 14항목과 필드 대응 (R-09.01~R-09.14):
 *   문제 ID → id            난이도 → difficulty        목표 → goal
 *   시작 데이터 → initialWorkbook.sheets[].initialData
 *   초기 시트 상태 → initialWorkbook.activeSheet, readOnlyRanges, rowCount, colCount
 *   허용된 작업 → allowedActions                       기대 결과 → grading.expectedResult
 *   채점 규칙 → grading                                힌트 단계 → hints (4단계)
 *   오답별 피드백 → misconceptions                     풀이 설명 → explanation
 *   권장 해결 방법 → recommendedSolution               대체 해결 방법 → alternativeSolutions
 *   점수 규칙 → scoring
 *
 * 이 파일은 채점 *데이터*만 정의한다. 교란 데이터 적용과 판정은 CARD-04B(PerturbationScorer)가 하며,
 * 교란 후 기대값은 canonicalFormula를 엔진 어댑터로 다시 계산해 얻는다(기대값을 따로 적지 않는다).
 */

/** 채점 판정 코드 (MASTER_PROMPT §9.1의 다섯 경우 + 참조 오류, TEST_STRATEGY Q-02). */
export const GRADING_DIAGNOSES = [
  'PASS', // 정확한 수식과 결과
  'ALTERNATE_FORMULA_PASS', // 다른 수식으로 같은 결과
  'HARDCODED_VALUE', // 숫자를 직접 입력해 우연히 같은 결과
  'INCOMPLETE_RANGE', // 수식은 맞지만 범위가 잘못됨
  'MISSING_ABSOLUTE_REF', // 절대 참조 누락
  'DATA_DEPENDENT', // 현재 데이터에서만 맞고 데이터가 바뀌면 틀림
] as const;

export const GradingDiagnosisSchema = z.enum(GRADING_DIAGNOSES);
export type GradingDiagnosis = z.infer<typeof GradingDiagnosisSchema>;

/** 오답 판정만 (통과 판정 제외) */
export const WRONG_DIAGNOSES = [
  'HARDCODED_VALUE',
  'INCOMPLETE_RANGE',
  'MISSING_ABSOLUTE_REF',
  'DATA_DEPENDENT',
] as const;

export const WrongDiagnosisSchema = z.enum(WRONG_DIAGNOSES);
export type WrongDiagnosis = z.infer<typeof WrongDiagnosisSchema>;

export const DIFFICULTIES = ['intro', 'beginner', 'intermediate', 'advanced', 'expert'] as const;
export const DifficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof DifficultySchema>;

/** 문제에서 허용하는 작업 종류 (R-09.06) */
export const ALLOWED_ACTIONS = [
  'ENTER_VALUE',
  'ENTER_FORMULA',
  'COPY_PASTE',
  'AUTOFILL',
  'FORMAT_CELLS',
  'INSERT_DELETE_ROW_COLUMN',
] as const;
export const AllowedActionSchema = z.enum(ALLOWED_ACTIONS);

/** 교란 변형 (Q-02): 변형 A 더하기, 변형 B 빈 행 삽입, 변형 C 배율 */
export const PERTURBATION_KINDS = ['ADD_SCALAR', 'INSERT_BLANK_ROW', 'MULTIPLY_SCALAR'] as const;

export const PerturbationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ADD_SCALAR'),
    targetRange: RangeAddressSchema,
    /**
     * 0이 아닌 수. 소수 자릿수는 대상 범위 데이터의 최대 소수 자릿수를 넘을 수 없다(교란해도 자릿수가 늘지 않는다).
     * 정답 수식이 숫자를 글자로 바꾸면 정수 데이터에 정수만 더할 수 있다(superRefine).
     */
    value: z.number().refine((n) => n !== 0, { message: '더할 값은 0이 아니어야 합니다.' }),
  }),
  z.object({ kind: z.literal('INSERT_BLANK_ROW'), targetRange: RangeAddressSchema }),
  z.object({
    kind: z.literal('MULTIPLY_SCALAR'),
    targetRange: RangeAddressSchema,
    /** 2 이상의 정수. 소수를 곱하면 자릿수가 늘어난다 */
    value: z.number().int().min(2, { message: '곱할 값은 2 이상의 정수여야 합니다.' }),
  }),
]);
export type Perturbation = z.infer<typeof PerturbationSchema>;

/** 대표 오답 (Q-03, R-09.10): 학습자가 흔히 하는 입력과 그 이유 설명 */
export const MisconceptionSchema = z.object({
  diagnosis: WrongDiagnosisSchema,
  /** 이 오답을 재현하는 셀 입력. verify-content(CARD-04E)가 그대로 넣어 본다 */
  input: z.string().min(1),
  /** 왜 틀렸는지 구체적으로 (MASTER_PROMPT §9.2). 정답을 그대로 알려 주지 않는다 */
  feedback: z.string().min(1).max(500),
});
export type Misconception = z.infer<typeof MisconceptionSchema>;

const SheetDataSchema = z.object({
  rowCount: z.number().int().min(1).max(ENGINE_LIMITS.maxRows).default(20),
  colCount: z.number().int().min(1).max(ENGINE_LIMITS.maxColumns).default(10),
  initialData: z.array(z.array(z.union([CellValueSchema, z.null()]))),
  /** 수정할 수 없는 영역 (예: ["A1:D1"]) */
  readOnlyRanges: z.array(RangeAddressSchema).default([]),
});

const HintsSchema = z.tuple([
  z.string().min(1), // 1단계: 필요한 개념
  z.string().min(1), // 2단계: 사용할 범위·기능
  z.string().min(1), // 3단계: 수식 골격·작업 순서
  z.string().min(1), // 4단계: 완전한 풀이와 이유
]);

const FormulaSchema = z.string().regex(/^=/, { message: "수식은 '='로 시작해야 합니다." });

const GradingSchema = z.object({
  targetSheet: z.string().min(1).max(31).default('Sheet1'),
  targetCell: CellAddressSchema,
  /** 기준 정답 수식. 교란 후 기대값은 이 수식을 다시 계산해 얻는다 */
  canonicalFormula: FormulaSchema,
  expectedResult: CellValueSchema,
  /**
   * REQUIRE_FUNCTION: 함수·개념 사용 자체를 배우는 문제. requiredFunctions를 반드시 써야 한다.
   * ALLOW_EQUIVALENT: 자유 해결 문제. 교란 데이터에서도 같은 결과를 내면 다른 수식을 허용한다(MASTER_PROMPT §9.1).
   */
  mode: z.enum(['REQUIRE_FUNCTION', 'ALLOW_EQUIVALENT']),
  requiredFunctions: z.array(z.string().regex(/^[A-Z][A-Z0-9.]*$/)).default([]),
  forbiddenFunctions: z.array(z.string().regex(/^[A-Z][A-Z0-9.]*$/)).default([]),
  perturbations: z.array(PerturbationSchema).min(PERTURBATION_KINDS.length),
});

export const ProblemDefinitionSchema = z
  .object({
    id: ProblemIdSchema,
    courseId: CourseIdSchema,
    moduleId: ModuleIdSchema,
    examVersion: ExamVersionSchema.default('standard'),
    difficulty: DifficultySchema,
    title: z.string().min(1).max(100),
    /** 일반 텍스트. 화면에서 HTML로 해석하지 않는다 */
    goal: z.string().min(1).max(500),
    /** 문제 조건 (R-04.42) */
    conditions: z.array(z.string().min(1)).default([]),
    initialWorkbook: z.object({
      activeSheet: z.string().min(1).max(31),
      sheets: z.record(z.string().min(1).max(31), SheetDataSchema),
    }),
    allowedActions: z.array(AllowedActionSchema).min(1),
    grading: GradingSchema,
    misconceptions: z.array(MisconceptionSchema).min(2),
    hints: HintsSchema,
    explanation: z.string().min(1),
    recommendedSolution: z.object({
      steps: z.array(z.string().min(1)).min(1),
      formula: FormulaSchema.optional(),
    }),
    alternativeSolutions: z
      .array(z.object({ description: z.string().min(1), formula: FormulaSchema.optional() }))
      .default([]),
    scoring: z
      .object({
        points: z.number().int().positive().default(20),
        /** 힌트 한 단계를 열 때 깎는 점수. 학습을 지나치게 처벌하지 않도록 합계는 배점의 절반 이하 (R-09.32) */
        hintPenaltyPerStep: z.number().int().min(0).default(2),
      })
      .prefault({}),
    completionCriteria: z.string().min(1),
  })
  .superRefine((problem, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (levelOfProblemId(problem.id) !== levelOfCourseId(problem.courseId)) {
      issue(['id'], 'problemId의 레벨이 courseId의 레벨과 다릅니다.');
    }
    if (levelOfModuleId(problem.moduleId) !== levelOfCourseId(problem.courseId)) {
      issue(['moduleId'], 'moduleId의 레벨이 courseId의 레벨과 다릅니다.');
    }

    const { grading, initialWorkbook } = problem;
    const sheets = initialWorkbook.sheets;
    if (Object.keys(sheets).length === 0)
      issue(['initialWorkbook', 'sheets'], '시트가 하나 이상 있어야 합니다.');
    if (sheets[initialWorkbook.activeSheet] === undefined) {
      issue(
        ['initialWorkbook', 'activeSheet'],
        `activeSheet '${initialWorkbook.activeSheet}' 시트가 없습니다.`,
      );
    }

    for (const [name, sheet] of Object.entries(sheets)) {
      const rows = sheet.initialData.length;
      const cols = Math.max(0, ...sheet.initialData.map((row) => row.length));
      if (rows > sheet.rowCount || cols > sheet.colCount) {
        issue(
          ['initialWorkbook', 'sheets', name, 'initialData'],
          `시작 데이터(${rows}행 × ${cols}열)가 시트 크기(${sheet.rowCount}행 × ${sheet.colCount}열)보다 큽니다.`,
        );
      }
      sheet.readOnlyRanges.forEach((range, index) => {
        if (!rangeFits(range, sheet)) {
          issue(
            ['initialWorkbook', 'sheets', name, 'readOnlyRanges', index],
            `수정 금지 범위 ${range}가 시트 밖입니다.`,
          );
        }
      });
    }

    const convertsText = [
      grading.canonicalFormula,
      problem.recommendedSolution.formula,
      ...problem.alternativeSolutions.map((alt) => alt.formula),
    ].some((formula) => formula !== undefined && convertsNumbersToText(formula));

    const targetSheet = sheets[grading.targetSheet];
    if (targetSheet === undefined) {
      issue(['grading', 'targetSheet'], `채점 대상 시트 '${grading.targetSheet}'가 없습니다.`);
    } else {
      if (!rangeFits(grading.targetCell, targetSheet)) {
        issue(['grading', 'targetCell'], `채점 대상 셀 ${grading.targetCell}가 시트 밖입니다.`);
      }
      if (targetSheet.readOnlyRanges.some((range) => rangesOverlap(range, grading.targetCell))) {
        issue(
          ['grading', 'targetCell'],
          `채점 대상 셀 ${grading.targetCell}가 수정 금지 범위 안에 있어 입력할 수 없습니다.`,
        );
      }
      grading.perturbations.forEach((perturbation, index) => {
        const path = ['grading', 'perturbations', index, 'targetRange'];
        if (!rangeFits(perturbation.targetRange, targetSheet)) {
          issue(path, `교란 범위 ${perturbation.targetRange}가 시트 밖입니다.`);
          return;
        }
        if (perturbation.kind === 'INSERT_BLANK_ROW') return;
        const scan = scanNumericRange(perturbation.targetRange, targetSheet.initialData);
        if (scan.nonNumeric !== null) {
          issue(
            path,
            `교란 범위 안 ${scan.nonNumeric}가 숫자가 아닙니다. 더하기·배율 교란은 숫자 셀에만 씁니다.`,
          );
          return;
        }
        if (convertsText && scan.maxDecimals > 0) {
          issue(
            path,
            `정답 수식이 숫자를 글자로 바꾸는데(&, CONCAT, TEXT 등) 교란 범위에 소수가 있습니다. ROUND 등으로 감싸거나 정수 데이터를 쓰세요(D-6, D-9).`,
          );
        }
        if (
          perturbation.kind === 'ADD_SCALAR' &&
          decimalPlaces(perturbation.value) > scan.maxDecimals
        ) {
          issue(
            ['grading', 'perturbations', index, 'value'],
            `더할 값 ${perturbation.value}의 소수 자릿수가 데이터(${scan.maxDecimals}자리)보다 많습니다. 교란 후에도 데이터의 자릿수를 유지해야 합니다.`,
          );
        }
      });
    }

    const kinds = new Set(grading.perturbations.map((p) => p.kind));
    for (const kind of PERTURBATION_KINDS) {
      if (!kinds.has(kind)) {
        issue(
          ['grading', 'perturbations'],
          `교란 변형 ${kind}가 필요합니다(Q-02: 더하기·빈 행 삽입·배율 각 1개 이상).`,
        );
      }
    }

    for (const lintIssue of lintFormula(grading.canonicalFormula)) {
      issue(['grading', 'canonicalFormula'], `[${lintIssue.rule}] ${lintIssue.message}`);
    }
    if (problem.recommendedSolution.formula !== undefined) {
      for (const l of lintFormula(problem.recommendedSolution.formula)) {
        issue(['recommendedSolution', 'formula'], `[${l.rule}] ${l.message}`);
      }
    }
    problem.alternativeSolutions.forEach((alt, index) => {
      if (alt.formula === undefined) return;
      for (const l of lintFormula(alt.formula)) {
        issue(['alternativeSolutions', index, 'formula'], `[${l.rule}] ${l.message}`);
      }
    });

    if (grading.mode === 'REQUIRE_FUNCTION' && grading.requiredFunctions.length === 0) {
      issue(
        ['grading', 'requiredFunctions'],
        'REQUIRE_FUNCTION 문제는 requiredFunctions가 필요합니다.',
      );
    }
    const overlap = grading.requiredFunctions.filter((f) => grading.forbiddenFunctions.includes(f));
    if (overlap.length > 0) {
      issue(
        ['grading', 'forbiddenFunctions'],
        `필수 함수와 금지 함수가 겹칩니다: ${overlap.join(', ')}`,
      );
    }

    if (new Set(problem.misconceptions.map((m) => m.diagnosis)).size < 2) {
      issue(['misconceptions'], '대표 오답은 서로 다른 판정 코드로 2개 이상 필요합니다(Q-03).');
    }
    problem.misconceptions.forEach((m, index) => {
      const isFormula = m.input.startsWith('=');
      if (m.diagnosis === 'HARDCODED_VALUE' && isFormula) {
        issue(
          ['misconceptions', index, 'input'],
          'HARDCODED_VALUE 오답은 수식이 아닌 값이어야 합니다.',
        );
      }
      if (m.diagnosis !== 'HARDCODED_VALUE' && !isFormula) {
        issue(['misconceptions', index, 'input'], `${m.diagnosis} 오답은 수식이어야 합니다.`);
      }
      if (
        m.input.replace(/\s/g, '').toUpperCase() ===
        grading.canonicalFormula.replace(/\s/g, '').toUpperCase()
      ) {
        issue(['misconceptions', index, 'input'], '대표 오답이 기준 정답과 같습니다.');
      }
    });

    const { points, hintPenaltyPerStep } = problem.scoring;
    if (hintPenaltyPerStep * problem.hints.length > points / 2) {
      issue(
        ['scoring', 'hintPenaltyPerStep'],
        '힌트 감점의 합계는 배점의 절반을 넘을 수 없습니다.',
      );
    }
  });

export type ProblemDefinition = z.infer<typeof ProblemDefinitionSchema>;
export type ProblemDefinitionInput = z.input<typeof ProblemDefinitionSchema>;

/** 학습 환경 (R-06.16) */
export const SUPPORTED_ENVIRONMENTS = ['EXCEL_DESKTOP', 'EXCEL_WEB', 'GOOGLE_SHEETS'] as const;

/** 모듈 메타데이터 (R-06.01~R-06.17). 본문 튜토리얼·문제는 ID로만 참조한다. */
export const ModuleMetaSchema = z.object({
  id: ModuleIdSchema,
  courseId: CourseIdSchema,
  examVersion: ExamVersionSchema.default('standard'),
  title: z.string().min(1).max(100),
  learningArea: z.string().min(1).max(50),
  difficulty: DifficultySchema,
  prerequisites: z.array(ModuleIdSchema).default([]),
  objectives: z.array(z.string().min(1)).min(1),
  conceptSummary: z.string().min(1).max(1000),
  workUseCase: z.string().min(1).max(1000),
  tutorialId: ModuleIdSchema.optional(),
  problemIds: z.array(ProblemIdSchema).default([]),
  /** 복습 간격(일) */
  reviewIntervalsDays: z.array(z.number().int().positive()).min(1).default([1, 3, 7, 14, 30]),
  shortcuts: z
    .array(z.object({ keys: z.string().min(1), description: z.string().min(1) }))
    .default([]),
  supportedEnvironments: z.array(z.enum(SUPPORTED_ENVIRONMENTS)).min(1),
  completion: z.object({
    minProblemsPassed: z.number().int().min(0),
    requireTutorial: z.boolean().default(true),
  }),
});
export type ModuleMeta = z.infer<typeof ModuleMetaSchema>;

export const CourseMetaSchema = z
  .object({
    id: CourseIdSchema,
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    modules: z.array(ModuleMetaSchema).default([]),
  })
  .superRefine((course, ctx) => {
    const level = levelOfCourseId(course.id);
    const seen = new Set<string>();
    course.modules.forEach((module, index) => {
      const add = (path: string, message: string) =>
        ctx.addIssue({ code: 'custom', path: ['modules', index, path], message });
      if (module.courseId !== course.id)
        add('courseId', `courseId가 코스(${course.id})와 다릅니다.`);
      if (levelOfModuleId(module.id) !== level) add('id', 'moduleId의 레벨이 코스와 다릅니다.');
      if (seen.has(module.id)) add('id', `모듈 ID '${module.id}'가 중복됩니다.`);
      seen.add(module.id);
      if (module.completion.minProblemsPassed > module.problemIds.length) {
        add('completion', '통과해야 할 문제 수가 모듈의 문제 수보다 많습니다.');
      }
    });
    course.modules.forEach((module, index) => {
      module.prerequisites.forEach((pre) => {
        if (pre === module.id) {
          ctx.addIssue({
            code: 'custom',
            path: ['modules', index, 'prerequisites'],
            message: '자기 자신을 선수 개념으로 둘 수 없습니다.',
          });
        }
      });
    });
  });
export type CourseMeta = z.infer<typeof CourseMetaSchema>;

// --- 주소 계산 보조 (입력 형식은 CellAddressSchema·RangeAddressSchema가 보장한다) ---

interface Bounds {
  c1: number;
  r1: number;
  c2: number;
  r2: number;
}

function toBounds(range: string): Bounds {
  const [a = '', b = a] = range.split(':');
  const pos = (cell: string) => {
    const m = /^([A-Z]+)(\d+)$/.exec(cell);
    const letters = m?.[1] ?? 'A';
    const col = [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    return { col, row: Number(m?.[2] ?? 1) };
  };
  const p = pos(a);
  const q = pos(b);
  return {
    c1: Math.min(p.col, q.col),
    r1: Math.min(p.row, q.row),
    c2: Math.max(p.col, q.col),
    r2: Math.max(p.row, q.row),
  };
}

function rangeFits(range: string, sheet: { rowCount: number; colCount: number }): boolean {
  const b = toBounds(range);
  return b.c2 <= sheet.colCount && b.r2 <= sheet.rowCount;
}

function rangesOverlap(a: string, b: string): boolean {
  const x = toBounds(a);
  const y = toBounds(b);
  return x.c1 <= y.c2 && y.c1 <= x.c2 && x.r1 <= y.r2 && y.r1 <= x.r2;
}

function columnLetters(col: number): string {
  let n = col;
  let out = '';
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** 범위 안 숫자 셀의 최대 소수 자릿수와, 숫자가 아닌 첫 셀 주소. 빈 셀은 건너뛴다. */
function scanNumericRange(
  range: string,
  data: readonly (readonly (string | number | boolean | null)[])[],
): { nonNumeric: string | null; maxDecimals: number } {
  const b = toBounds(range);
  let maxDecimals = 0;
  for (let row = b.r1; row <= b.r2; row += 1) {
    for (let col = b.c1; col <= b.c2; col += 1) {
      const value = data[row - 1]?.[col - 1];
      if (value === undefined || value === null || value === '') continue;
      if (typeof value !== 'number')
        return { nonNumeric: `${columnLetters(col)}${row}`, maxDecimals };
      maxDecimals = Math.max(maxDecimals, decimalPlaces(value));
    }
  }
  return { nonNumeric: null, maxDecimals };
}

import { unstableTextOperands } from '@/content/contentLint';
import {
  gradeSubmission,
  GradingContentError,
  type GradingResult,
  type SheetContents,
} from '@/engine/grading/PerturbationScorer';
import {
  ContentLoadError,
  createContentLoader,
  type ContentSource,
} from '@/engine/grading/problemLoader';
import { positionOfAddress } from '@/engine/spreadsheet/operations/referenceShift';
import type { CellScalar } from '@/engine/spreadsheet/FormulaEngineAdapter';
import {
  ProblemDefinitionSchema,
  type AllowedAction,
  type ProblemDefinition,
} from '@/types/problem.schema';

/*
 * 콘텐츠 자체 검증 (CARD-04E, Q-03). scripts/verify-content.ts와 단위 테스트가 같이 쓴다.
 * 문제마다 스키마, 기준 정답 채점, 대표 오답 판정, 허용 작업과 풀이 경로의 일치, 엔진 실행 검증을 한다.
 * 실패는 어느 문제(ID)가 왜 실패했는지 한국어로 모아서 돌려준다. 문제 ID별 분기는 없다.
 */

export interface ContentFailure {
  /** 실패한 문제 ID. 문제 하나에 속하지 않는 실패는 '(콘텐츠 구성)' */
  problemId: string;
  /** 검사 이름 */
  check: string;
  message: string;
}

export const GLOBAL_PROBLEM = '(콘텐츠 구성)';

const ACTION_NAMES: Record<AllowedAction, string> = {
  ENTER_VALUE: '값 입력(ENTER_VALUE)',
  ENTER_FORMULA: '수식 입력(ENTER_FORMULA)',
  COPY_PASTE: '복사·붙여넣기(COPY_PASTE)',
  AUTOFILL: '자동 채우기(AUTOFILL)',
  FORMAT_CELLS: '셀 서식(FORMAT_CELLS)',
  INSERT_DELETE_ROW_COLUMN: '행·열 삽입·삭제(INSERT_DELETE_ROW_COLUMN)',
};

const nameOf = (actions: readonly AllowedAction[]) =>
  actions.map((action) => ACTION_NAMES[action]).join(', ');

/** 풀이 설명 글에서 읽을 수 있는 작업 단서. 글과 requiredActions가 어긋나면 실패시킨다. */
const STEP_KEYWORDS: ReadonlyArray<readonly [RegExp, AllowedAction]> = [
  [/채우기|채워|자동 ?채/, 'AUTOFILL'],
  [/복사|붙여넣|잘라/, 'COPY_PASTE'],
  [/행.{0,6}(삽입|삭제)|열.{0,6}(삽입|삭제)/, 'INSERT_DELETE_ROW_COLUMN'],
];

/** 데이터 때문에 소수가 되는 값이 글자로 바뀔 때, 엔진(JS)과 Excel의 표시가 갈리기 시작하는 소수 자릿수 */
const SAFE_FRACTION_DIGITS = 4;

/** 문제의 시작 시트에서 대상 셀 칸에 입력한 값을 넣은 채점기 입력. 숫자 원문은 화면처럼 숫자로 넘긴다. */
export function submissionWithInput(problem: ProblemDefinition, input: string): SheetContents {
  const sheets: Record<string, CellScalar[][]> = {};
  for (const [name, sheet] of Object.entries(problem.initialWorkbook.sheets)) {
    sheets[name] = sheet.initialData.map((row) => [...row]);
  }
  const position = positionOfAddress(problem.grading.targetCell);
  if (position === null)
    throw new GradingContentError(`대상 셀 주소 오류: ${problem.grading.targetCell}`);
  const grid = sheets[problem.grading.targetSheet] ?? [];
  while (grid.length <= position.row) grid.push([]);
  const line = grid[position.row] ?? [];
  while (line.length <= position.col) line.push(null);
  line[position.col] = /^-?\d+(\.\d+)?$/.test(input) ? Number(input) : input;
  grid[position.row] = line;
  sheets[problem.grading.targetSheet] = grid;
  return sheets;
}

async function grade(problem: ProblemDefinition, input: string): Promise<GradingResult> {
  return gradeSubmission(problem, { sheets: submissionWithInput(problem, input) });
}

interface Solution {
  label: string;
  steps: string;
  formula: string | undefined;
  requiredActions: readonly AllowedAction[] | undefined;
}

function solutionsOf(problem: ProblemDefinition): Solution[] {
  const recommended = problem.recommendedSolution;
  return [
    {
      label: '권장 풀이',
      steps: recommended.steps.join(' '),
      formula: recommended.formula,
      requiredActions: recommended.requiredActions,
    },
    ...problem.alternativeSolutions.map((alt, index) => ({
      label: `대체 풀이 ${index + 1}`,
      steps: alt.description,
      formula: alt.formula,
      requiredActions: alt.requiredActions,
    })),
  ];
}

/** 허용 작업과 풀이 경로가 맞는지 (CARD-04D에서 이월한 allowedActions 감사) */
function checkActions(problem: ProblemDefinition): ContentFailure[] {
  const failures: ContentFailure[] = [];
  const fail = (message: string) =>
    failures.push({ problemId: problem.id, check: '허용 작업', message });
  const allowed = new Set<AllowedAction>(problem.allowedActions);
  const used = new Set<AllowedAction>();
  const targetSheet = problem.initialWorkbook.sheets[problem.grading.targetSheet];
  const targetPosition = positionOfAddress(problem.grading.targetCell);
  const targetStart =
    targetSheet === undefined || targetPosition === null
      ? null
      : (targetSheet.initialData[targetPosition.row]?.[targetPosition.col] ?? null);

  for (const solution of solutionsOf(problem)) {
    const required = solution.requiredActions;
    if (required === undefined) {
      fail(
        `${solution.label}에 필요한 작업(requiredActions)이 적혀 있지 않습니다. 풀이 경로에 필요한 작업을 적어야 허용 작업과 맞는지 확인할 수 있습니다.`,
      );
      continue;
    }
    required.forEach((action) => used.add(action));
    const missing = required.filter((action) => !allowed.has(action));
    if (missing.length > 0) {
      fail(
        `${solution.label}에 ${nameOf(missing)}이(가) 필요한데 allowedActions에 없습니다. 학생이 이 풀이를 할 수 없습니다. allowedActions(${nameOf(problem.allowedActions)})를 고치세요.`,
      );
    }
    for (const [pattern, action] of STEP_KEYWORDS) {
      if (pattern.test(solution.steps) && !required.includes(action)) {
        fail(
          `${solution.label} 설명이 ${nameOf([action])}을(를) 쓰는 것처럼 보이는데 requiredActions에 없습니다.`,
        );
      }
    }
    const reachesFormula = required.some(
      (action) => action === 'ENTER_FORMULA' || action === 'AUTOFILL' || action === 'COPY_PASTE',
    );
    if (
      solution.formula !== undefined &&
      (targetStart === null || targetStart === '') &&
      !reachesFormula
    ) {
      fail(
        `${solution.label}은 빈 칸 ${problem.grading.targetCell}에 수식을 만들어야 하는데 수식 입력·채우기·붙여넣기 중 어느 작업도 필요한 작업에 없습니다.`,
      );
    }
  }

  // 학생이 값을 직접 입력해 보는 시도는 HARDCODED_VALUE 오답으로 채점해 안내한다(MASTER_PROMPT §9.1).
  // 그 안내가 화면에 나오려면 값 입력을 허용해야 하고, 그 경우 ENTER_VALUE는 쓰이는 작업이다.
  if (problem.misconceptions.some((m) => m.diagnosis === 'HARDCODED_VALUE')) {
    if (!allowed.has('ENTER_VALUE')) {
      fail(
        `HARDCODED_VALUE 대표 오답의 안내는 학생이 값을 직접 입력해야 보이는데 allowedActions에 ${nameOf(['ENTER_VALUE'])}이(가) 없어 화면에서 나올 수 없습니다. 값 입력을 허용해 채점으로 안내하세요.`,
      );
    }
    used.add('ENTER_VALUE');
  }
  const unused = problem.allowedActions.filter((action) => !used.has(action));
  if (unused.length > 0) {
    fail(
      `allowedActions의 ${nameOf(unused)}은(는) 어떤 풀이 경로(권장·대체 풀이)에도 쓰이지 않습니다. 실제 풀이에 맞게 줄이거나 대체 풀이를 적으세요.`,
    );
  }
  return failures;
}

const FILTER_HINT =
  ' FILTER에 일치하는 값이 없으면 Excel(#CALC!)과 엔진(#N/A)의 오류가 다릅니다. 세 번째 인수(일치 없을 때 값)나 IFERROR로 감싸세요(D-12).';

/** 데이터 때문에 소수가 되는 값을 글자로 이어 붙이는지, 오류 값이 나오는지 엔진으로 계산해 본다. */
async function checkEngineExecution(problem: ProblemDefinition): Promise<ContentFailure[]> {
  const failures: ContentFailure[] = [];
  const fail = (check: string, message: string) =>
    failures.push({ problemId: problem.id, check, message });
  const formulas = [
    ...new Set(
      [
        problem.grading.canonicalFormula,
        ...solutionsOf(problem).map((solution) => solution.formula),
      ].filter((formula): formula is string => formula !== undefined),
    ),
  ];

  for (const formula of formulas) {
    const withFilter = /FILTER\s*\(/i.test(formula);
    let result: GradingResult;
    try {
      result = await grade(problem, formula);
    } catch (error) {
      if (!(error instanceof GradingContentError)) throw error;
      fail(
        '엔진 실행(오류 값)',
        `수식 ${formula}을(를) 계산할 수 없습니다: ${error.message}${withFilter ? FILTER_HINT : ''}`,
      );
      continue;
    }
    for (const dataset of result.datasets) {
      if (dataset.studentError !== null) {
        fail(
          '엔진 실행(오류 값)',
          `수식 ${formula}이(가) '${dataset.label}' 데이터에서 오류가 됩니다: ${dataset.studentError}${withFilter ? FILTER_HINT : ''}`,
        );
        break;
      }
    }

    for (const operand of unstableTextOperands(formula)) {
      const probe = await grade(problem, `=${operand}`);
      for (const dataset of probe.datasets) {
        const value = dataset.studentValue;
        if (typeof value !== 'number' || Number.isInteger(value)) continue;
        const fraction = String(value).split('.')[1] ?? '';
        if (fraction.length > SAFE_FRACTION_DIGITS) {
          fail(
            '엔진 실행(소수를 글자로)',
            `수식 ${formula}에서 글자로 이어 붙이는 ${operand}이(가) '${dataset.label}' 데이터에서 ${value}이(가) 됩니다. 소수 자릿수가 길어 엔진과 Excel의 표시가 달라질 수 있으니 ROUND 등으로 먼저 감싸거나 나누어떨어지는 데이터를 쓰세요(D-6, D-9).`,
          );
          break;
        }
      }
    }

    for (const blank of blankCellsInUnique(problem, formula)) {
      fail(
        '엔진 실행(UNIQUE 빈 셀)',
        `수식 ${formula}의 UNIQUE 대상 범위에 빈 셀 ${blank}이(가) 있습니다. Excel은 0, 엔진은 빈 칸으로 보여 결과가 다릅니다. 대상 범위에 빈 셀을 두지 마세요(D-13).`,
      );
    }
  }
  return failures;
}

const UNIQUE_RANGE =
  /UNIQUE\s*\(\s*(?:(?:'([^']+)'|([A-Za-z0-9_.]+))!)?\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/gi;

/** UNIQUE의 첫 인수가 가리키는 시작 데이터 범위 안의 빈 셀 주소들 */
function blankCellsInUnique(problem: ProblemDefinition, formula: string): string[] {
  const blanks: string[] = [];
  for (const match of formula.matchAll(UNIQUE_RANGE)) {
    const sheetName = match[1] ?? match[2] ?? problem.grading.targetSheet;
    const sheet = problem.initialWorkbook.sheets[sheetName];
    const start = positionOfAddress(`${match[3] ?? ''}${match[4] ?? ''}`);
    const end = positionOfAddress(`${match[5] ?? match[3] ?? ''}${match[6] ?? match[4] ?? ''}`);
    if (sheet === undefined || start === null || end === null) continue;
    for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row += 1) {
      for (let col = Math.min(start.col, end.col); col <= Math.max(start.col, end.col); col += 1) {
        const value = sheet.initialData[row]?.[col] ?? null;
        if (value === null || value === '') {
          let letters = '';
          for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) {
            letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
          }
          blanks.push(`${sheetName}!${letters}${row + 1}`);
        }
      }
    }
  }
  return blanks;
}

const sameValue = (actual: CellScalar, expected: CellScalar): boolean =>
  typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) < 1e-9
    : actual === expected;

/** 문제 하나를 검증한다. 문제가 스키마를 통과한 뒤에 부른다. */
export async function verifyProblem(problem: ProblemDefinition): Promise<ContentFailure[]> {
  const failures: ContentFailure[] = [];
  const fail = (check: string, message: string) =>
    failures.push({ problemId: problem.id, check, message });

  try {
    const canonical = await grade(problem, problem.grading.canonicalFormula);
    if (!canonical.passed || canonical.diagnosis !== 'PASS') {
      fail(
        '기준 정답',
        `기준 정답 ${problem.grading.canonicalFormula}이(가) 채점을 통과하지 못했습니다(판정: ${canonical.diagnosis ?? canonical.outcome}). ${canonical.reason}`,
      );
    }

    const baseValue = canonical.datasets.find((dataset) => dataset.kind === 'BASE')?.studentValue;
    if (
      baseValue !== undefined &&
      !sameValue(baseValue, problem.grading.expectedResult) &&
      canonical.outcome !== 'ERROR_VALUE'
    ) {
      fail(
        '기준 정답 값',
        `기준 정답 ${problem.grading.canonicalFormula}의 계산 결과는 ${JSON.stringify(baseValue)}인데 expectedResult는 ${JSON.stringify(problem.grading.expectedResult)}입니다. 둘 중 하나가 틀렸습니다.`,
      );
    }

    for (const solution of solutionsOf(problem)) {
      if (solution.formula === undefined) continue;
      const result = await grade(problem, solution.formula);
      if (!result.passed) {
        fail(
          '권장·대체 풀이',
          `${solution.label}의 수식 ${solution.formula}이(가) 채점을 통과하지 못했습니다(판정: ${result.diagnosis ?? result.outcome}). ${result.reason}`,
        );
      }
    }

    for (const misconception of problem.misconceptions) {
      const result = await grade(problem, misconception.input);
      if (result.passed) {
        fail(
          '대표 오답',
          `대표 오답 ${misconception.input}이(가) 통과해 버립니다. 오답이 아니거나 교란 데이터가 오답을 걸러내지 못합니다.`,
        );
      } else if (result.diagnosis !== misconception.diagnosis) {
        fail(
          '대표 오답',
          `대표 오답 ${misconception.input}의 판정이 선언한 ${misconception.diagnosis}과 다릅니다(실제: ${result.diagnosis ?? result.outcome}).`,
        );
      } else if (result.misconceptionFeedback !== misconception.feedback) {
        fail(
          '대표 오답',
          `대표 오답 ${misconception.input}에 적은 오답 안내 문장이 채점 결과에 연결되지 않습니다.`,
        );
      }
    }

    const untouched: SheetContents = Object.fromEntries(
      Object.entries(problem.initialWorkbook.sheets).map(([name, sheet]) => [
        name,
        sheet.initialData.map((row) => [...row]),
      ]),
    );
    if ((await gradeSubmission(problem, { sheets: untouched })).passed) {
      fail(
        '시작 상태',
        '아무것도 입력하지 않은 시작 상태가 통과합니다. 대상 칸이 비어 있어야 합니다.',
      );
    }
  } catch (error) {
    if (!(error instanceof GradingContentError)) throw error;
    fail('채점 불가', `채점할 수 없는 문제입니다: ${error.message}`);
  }

  try {
    failures.push(...(await checkEngineExecution(problem)));
  } catch (error) {
    if (!(error instanceof GradingContentError)) throw error;
    fail('엔진 실행', `수식을 계산할 수 없습니다: ${error.message}`);
  }

  failures.push(...checkActions(problem));
  return failures;
}

/** 같은 정답 뼈대에 숫자와 주소만 바꾼 문제 (R-09.33) */
function skeletonOf(problem: ProblemDefinition): string {
  const formula = problem.grading.canonicalFormula
    .replace(/\$?[A-Z]+\$?\d+/g, 'REF')
    .replace(/\d+/g, 'N');
  const sheet = problem.initialWorkbook.sheets[problem.grading.targetSheet];
  const width = Math.max(0, ...(sheet?.initialData.map((row) => row.length) ?? []));
  return `${formula}|${sheet?.initialData.length}x${width}`;
}

/** 문제 전체 검증: 문제별 검사와 문제 사이 중복 검사 */
export async function verifyProblems(
  problems: readonly ProblemDefinition[],
): Promise<ContentFailure[]> {
  const failures: ContentFailure[] = [];
  for (const problem of problems) failures.push(...(await verifyProblem(problem)));

  const firstByTitle = new Map<string, string>();
  const firstBySkeleton = new Map<string, string>();
  for (const problem of problems) {
    const sameTitle = firstByTitle.get(problem.title);
    if (sameTitle === undefined) firstByTitle.set(problem.title, problem.id);
    else {
      failures.push({
        problemId: problem.id,
        check: '중복',
        message: `제목 '${problem.title}'이(가) ${sameTitle}와 같습니다.`,
      });
    }
    const skeleton = skeletonOf(problem);
    const same = firstBySkeleton.get(skeleton);
    if (same === undefined) firstBySkeleton.set(skeleton, problem.id);
    else {
      failures.push({
        problemId: problem.id,
        check: '중복(R-09.33)',
        message: `${same}와 정답 수식 모양과 시작 데이터 크기가 같습니다. 숫자와 칸 주소만 바꾼 문제를 반복하지 마세요.`,
      });
    }
  }
  return failures;
}

function rawIdOf(raw: unknown, fallback: string): string {
  if (typeof raw === 'object' && raw !== null && 'id' in raw && typeof raw.id === 'string') {
    return raw.id;
  }
  return fallback;
}

/**
 * 콘텐츠 소스 전체 검증. 스키마 위반은 문제 ID와 함께 모아 알리고, 스키마가 모두 맞으면 코스·모듈 연결과
 * 문제별 검증을 이어서 한다.
 */
export async function verifyContentSource(
  source: ContentSource,
): Promise<{ problemCount: number; failures: ContentFailure[] }> {
  const failures: ContentFailure[] = [];
  let rawCount = 0;
  for (const [file, mod] of Object.entries(source.exercises)) {
    const list =
      typeof mod === 'object' && mod !== null
        ? (mod as Record<string, unknown>).problems
        : undefined;
    if (!Array.isArray(list)) {
      failures.push({
        problemId: GLOBAL_PROBLEM,
        check: '스키마',
        message: `${file}: 'problems' 배열을 export해야 합니다.`,
      });
      continue;
    }
    list.forEach((raw: unknown, index) => {
      rawCount += 1;
      const parsed = ProblemDefinitionSchema.safeParse(raw);
      if (parsed.success) return;
      const problemId = rawIdOf(raw, `${file}[${index}]`);
      for (const issue of parsed.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(최상위)';
        failures.push({ problemId, check: '스키마', message: `${path}: ${issue.message}` });
      }
    });
  }
  if (failures.length > 0) return { problemCount: rawCount, failures };

  try {
    const loader = createContentLoader(source);
    const problems = loader.listProblems();
    return { problemCount: problems.length, failures: await verifyProblems(problems) };
  } catch (error) {
    if (!(error instanceof ContentLoadError)) throw error;
    return {
      problemCount: rawCount,
      failures: error.problems.map((message) => ({
        problemId: GLOBAL_PROBLEM,
        check: '콘텐츠 구성',
        message,
      })),
    };
  }
}

/** 실패 목록을 사람이 읽을 한국어 줄들로 */
export function formatFailures(failures: readonly ContentFailure[]): string[] {
  return failures.map((failure) => `✗ ${failure.problemId} [${failure.check}] ${failure.message}`);
}

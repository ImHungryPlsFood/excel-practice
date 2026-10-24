import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import type {
  CellResult,
  CellScalar,
  FormulaEngineAdapter,
} from '@/engine/spreadsheet/FormulaEngineAdapter';
import { resultsMatch } from '@/engine/spreadsheet/numberFormat';
import {
  adjustFormulaForStructure,
  positionOfAddress,
  shiftFormulaForCopy,
} from '@/engine/spreadsheet/operations/referenceShift';
import type { GradingDiagnosis, Perturbation, ProblemDefinition } from '@/types/problem.schema';

import {
  compareStructure,
  describePerturbation,
  functionNamesOf,
  isEmptyContent,
  isFormulaContent,
  normalizeContent,
  REASONS,
  type ReasonContext,
  type StructureComparison,
} from './diagnostics/misconceptionClassifier';

/*
 * 데이터 교란 채점기 (CARD-04B, MASTER_PROMPT §9.1, TEST_STRATEGY Q-02).
 * 학생 입력을 문자열로 비교하지 않고, 같은 입력을 교란한 데이터에 다시 계산해 정답 수식의 결과와 견준다.
 *   - 기대값은 problem.grading.canonicalFormula를 각 교란 데이터에 엔진으로 다시 계산해 얻는다(정답을 따로 적지 않는다).
 *   - 학생의 작업 시트는 읽기만 한다. 모든 계산은 복사본에서, 매번 새 엔진 어댑터로 하고 끝나면 destroy한다.
 *   - 통과·실패는 결과로 정한다. 정규화한 수식 문자열은 PASS와 ALTERNATE_FORMULA_PASS 라벨을 가를 때만 쓴다.
 */

/** 학생 작업 시트 스냅샷: 시트 이름 → 셀 내용(수식은 '='로 시작하는 문자열) */
export type SheetContents = Readonly<Record<string, readonly (readonly CellScalar[])[]>>;

export interface Submission {
  sheets: SheetContents;
}

/**
 * 판정 코드를 붙일 수 없는 결과 (04A의 GRADING_DIAGNOSES는 바꾸지 않았다).
 * DIAGNOSED면 diagnosis가 있고, 나머지는 diagnosis가 null이다.
 */
export type GradingOutcome =
  | 'DIAGNOSED'
  | 'NOT_ATTEMPTED'
  | 'ERROR_VALUE'
  | 'REQUIRED_FUNCTION_MISSING'
  | 'FORBIDDEN_FUNCTION_USED'
  | 'WRONG_RESULT';

export interface DatasetResult {
  kind: 'BASE' | Perturbation['kind'];
  /** 학생에게 보여 줄 한국어 설명 */
  label: string;
  studentValue: CellScalar;
  /** 학생 셀이 오류면 그 설명, 아니면 null */
  studentError: string | null;
  expectedValue: CellScalar;
  matched: boolean;
}

export interface GradingResult {
  passed: boolean;
  diagnosis: GradingDiagnosis | null;
  outcome: GradingOutcome;
  /** 학생에게 보여 줄 구체적인 이유 (R-09.23). 정답 수식을 그대로 알려 주지 않는다. */
  reason: string;
  /** 학생 입력이 문제의 대표 오답과 정확히 같을 때, 출제자가 적은 오답 설명 */
  misconceptionFeedback: string | null;
  /**
   * 통과했지만 알려 줄 점이 있을 때의 조언(예: 범위가 필요 이상으로 넓다). 판정 코드와 통과 여부는 바꾸지 않는다.
   * 통과가 아니거나 조언할 것이 없으면 null.
   */
  advice: string | null;
  /** 학생이 입력한 내용 */
  submitted: string;
  datasets: DatasetResult[];
}

export interface ScorerDeps {
  createAdapter?: () => FormulaEngineAdapter;
}

/** 문제 정의가 채점할 수 없을 때(기준 정답 수식 오류 등). 학생 오답이 아니라 콘텐츠 오류다. */
export class GradingContentError extends Error {
  override readonly name = 'GradingContentError';
}

interface Dataset {
  kind: DatasetResult['kind'];
  label: string;
  perturbation: Perturbation | null;
  sheets: Record<string, CellScalar[][]>;
  row: number;
  col: number;
  /** 이 데이터셋에 맞게 보정한 기준 정답 수식(빈 행이 끼면 참조가 밀린다) */
  canonical: string;
}

type Grid = CellScalar[][];

const COPY_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0],
  [2, 0],
  [0, 1],
];

function cloneSheets(sheets: SheetContents): Record<string, Grid> {
  return Object.fromEntries(
    Object.entries(sheets).map(([name, rows]) => [name, rows.map((row) => [...row])]),
  );
}

function rangeBounds(range: string): { r1: number; c1: number; r2: number; c2: number } {
  const [a = '', b = a] = range.split(':');
  const p = positionOfAddress(a);
  const q = positionOfAddress(b);
  if (p === null || q === null)
    throw new GradingContentError(`교란 범위 ${range}를 읽을 수 없습니다.`);
  return {
    r1: Math.min(p.row, q.row),
    c1: Math.min(p.col, q.col),
    r2: Math.max(p.row, q.row),
    c2: Math.max(p.col, q.col),
  };
}

const roundTo15 = (n: number): number => Number(n.toPrecision(15));

interface Target {
  row: number;
  col: number;
  canonical: string;
}

/** 교란을 복사본에 적용하고, 밀렸을 수 있는 대상 셀 위치와 그에 맞춘 기준 정답 수식을 돌려준다. */
function applyPerturbation(
  perturbation: Perturbation,
  sheets: Record<string, Grid>,
  sheetName: string,
  target: Target,
): Target {
  const grid = sheets[sheetName];
  if (grid === undefined) return target;
  const { r1, c1, r2, c2 } = rangeBounds(perturbation.targetRange);

  if (perturbation.kind === 'INSERT_BLANK_ROW') {
    const index = r1 + 1; // 범위의 첫 행 다음에 끼운다: 범위가 늘어나야 하는 상황
    while (grid.length < index) grid.push([]);
    grid.splice(index, 0, []);
    for (const [name, rows] of Object.entries(sheets)) {
      for (const line of rows) {
        line.forEach((cell, x) => {
          if (isFormulaContent(cell)) {
            line[x] = adjustFormulaForStructure(cell, name, {
              sheet: sheetName,
              axis: 'row',
              kind: 'insert',
              index,
              count: 1,
            });
          }
        });
      }
    }
    return {
      row: target.row >= index ? target.row + 1 : target.row,
      col: target.col,
      canonical: adjustFormulaForStructure(target.canonical, sheetName, {
        sheet: sheetName,
        axis: 'row',
        kind: 'insert',
        index,
        count: 1,
      }),
    };
  }

  for (let row = r1; row <= r2; row += 1) {
    const line = grid[row];
    if (line === undefined) continue;
    for (let col = c1; col <= c2; col += 1) {
      const cell = line[col];
      if (typeof cell !== 'number') continue;
      line[col] = roundTo15(
        perturbation.kind === 'ADD_SCALAR' ? cell + perturbation.value : cell * perturbation.value,
      );
    }
  }
  return target;
}

function buildDatasets(
  problem: ProblemDefinition,
  submitted: SheetContents,
  target: Target,
): Dataset[] {
  const sheetName = problem.grading.targetSheet;
  const datasets: Dataset[] = [
    {
      kind: 'BASE',
      label: describePerturbation(null),
      perturbation: null,
      sheets: cloneSheets(submitted),
      ...target,
    },
  ];
  for (const perturbation of problem.grading.perturbations) {
    const sheets = cloneSheets(submitted);
    const moved = applyPerturbation(perturbation, sheets, sheetName, target);
    datasets.push({
      kind: perturbation.kind,
      label: describePerturbation(perturbation),
      perturbation,
      sheets,
      ...moved,
    });
  }
  return datasets;
}

function scalarOf(result: CellResult): CellScalar {
  return result.error === null ? result.value : null;
}

/** 한 데이터셋에서 학생 셀과 정답 수식의 결과를 각각 계산한다. */
async function evaluateDataset(
  dataset: Dataset,
  problem: ProblemDefinition,
  createAdapter: () => FormulaEngineAdapter,
): Promise<DatasetResult> {
  const sheetName = problem.grading.targetSheet;
  const adapter = createAdapter();
  try {
    await adapter.initWorkbook(dataset.sheets);
    const student = adapter.getCellValue(sheetName, dataset.row, dataset.col);
    adapter.setCellContent(sheetName, dataset.row, dataset.col, dataset.canonical);
    const expected = adapter.getCellValue(sheetName, dataset.row, dataset.col);
    if (expected.error !== null) {
      throw new GradingContentError(
        `${problem.id}: 기준 정답 수식이 '${dataset.label}' 데이터에서 오류(${expected.error.code})입니다.`,
      );
    }
    return {
      kind: dataset.kind,
      label: dataset.label,
      studentValue: scalarOf(student),
      studentError:
        student.error === null ? null : `${student.error.code} ${student.error.message}`,
      expectedValue: expected.value,
      matched: student.error === null && resultsMatch(student.value, expected.value),
    };
  } finally {
    adapter.destroy();
  }
}

/**
 * 학생 수식을 아래·오른쪽 셀로 복사했을 때와 정답 수식을 같은 곳으로 복사했을 때의 값을 견준다.
 * 하나라도 다르면 true: 고정해야 할 참조가 복사에서 움직인 것이다(MISSING_ABSOLUTE_REF).
 */
async function copyBreaks(
  dataset: Dataset,
  problem: ProblemDefinition,
  studentFormula: string,
  createAdapter: () => FormulaEngineAdapter,
): Promise<boolean> {
  const sheetName = problem.grading.targetSheet;
  const adapter = createAdapter();
  try {
    await adapter.initWorkbook(dataset.sheets);
    for (const [dRow, dCol] of COPY_OFFSETS) {
      const row = dataset.row + dRow;
      const col = dataset.col + dCol;
      adapter.setCellContent(sheetName, row, col, shiftFormulaForCopy(studentFormula, dRow, dCol));
      const student = adapter.getCellValue(sheetName, row, col);
      adapter.setCellContent(
        sheetName,
        row,
        col,
        shiftFormulaForCopy(problem.grading.canonicalFormula, dRow, dCol),
      );
      const expected = adapter.getCellValue(sheetName, row, col);
      if (expected.error !== null) continue;
      if (student.error !== null || !resultsMatch(student.value, expected.value)) return true;
    }
    return false;
  } finally {
    adapter.destroy();
  }
}

/** 출제자가 적은 대표 오답과 학생 입력이 정확히 같으면 그 설명을 돌려준다. */
function exactMisconceptionFeedback(
  problem: ProblemDefinition,
  diagnosis: GradingDiagnosis,
  content: CellScalar,
): string | null {
  const mine = normalizeContent(content);
  const found = problem.misconceptions.find(
    (m) => m.diagnosis === diagnosis && normalizeContent(m.input) === mine,
  );
  return found?.feedback ?? null;
}

/** 통과한 수식의 범위가 정답과 다를 때(필요 이상으로 넓거나 좁을 때) 덧붙일 조언. 없으면 null. */
function rangeAdvice(
  comparison: StructureComparison | null,
  grid: readonly (readonly CellScalar[])[] | undefined,
): string | null {
  if (comparison === null || !comparison.referencesDiffer) return null;
  const extra = comparison.extraCells ?? [];
  const missing = comparison.missingCells ?? [];
  const texts = extra.filter((address) => {
    const pos = positionOfAddress(address);
    const cell = pos === null ? null : grid?.[pos.row]?.[pos.col];
    return typeof cell === 'string' && cell.trim() !== '' && !cell.trimStart().startsWith('=');
  });
  if (texts.length > 0) return REASONS.adviceTextInRange(texts);
  if (extra.length > 0) return REASONS.adviceWiderRange(extra);
  if (missing.length > 0) return REASONS.adviceNarrowerRange(missing);
  return null;
}

/**
 * 학생의 대상 셀을 채점한다. 학생 시트(submission)는 바꾸지 않는다.
 * 판정 순서: 빈 셀·오류 → 하드코딩 → 절대 참조 누락(복사 시뮬레이션) → 전부 일치(PASS/대체 수식/함수 규칙)
 *           → 범위 오류 → 데이터 의존 → 그 밖의 오답.
 */
export async function gradeSubmission(
  problem: ProblemDefinition,
  submission: Submission,
  deps: ScorerDeps = {},
): Promise<GradingResult> {
  const createAdapter = deps.createAdapter ?? (() => new HyperFormulaAdapter());
  const { grading } = problem;
  const target = positionOfAddress(grading.targetCell);
  if (target === null) {
    throw new GradingContentError(
      `${problem.id}: 채점 대상 셀 ${grading.targetCell}를 읽을 수 없습니다.`,
    );
  }

  const content = submission.sheets[grading.targetSheet]?.[target.row]?.[target.col] ?? null;
  const submitted = content === null ? '' : String(content);
  const result = (
    partial: Pick<GradingResult, 'passed' | 'diagnosis' | 'outcome' | 'reason'> &
      Partial<Pick<GradingResult, 'datasets'>>,
  ): GradingResult => ({
    misconceptionFeedback:
      partial.diagnosis === null || partial.passed
        ? null
        : exactMisconceptionFeedback(problem, partial.diagnosis, content),
    submitted,
    advice: null,
    datasets: [],
    ...partial,
  });
  const withFeedback = (r: GradingResult): GradingResult =>
    r.misconceptionFeedback === null
      ? r
      : { ...r, reason: `${r.reason} ${r.misconceptionFeedback}` };

  if (isEmptyContent(content)) {
    return result({
      passed: false,
      diagnosis: null,
      outcome: 'NOT_ATTEMPTED',
      reason: REASONS.notAttempted(grading.targetCell),
    });
  }

  const datasets: DatasetResult[] = [];
  const prepared = buildDatasets(problem, submission.sheets, {
    ...target,
    canonical: grading.canonicalFormula,
  });
  for (const dataset of prepared)
    datasets.push(await evaluateDataset(dataset, problem, createAdapter));

  const [base] = datasets;
  if (base === undefined)
    throw new GradingContentError(`${problem.id}: 계산할 데이터셋이 없습니다.`);
  if (base.studentError !== null) {
    const [code = '', ...message] = base.studentError.split(' ');
    return result({
      passed: false,
      diagnosis: null,
      outcome: 'ERROR_VALUE',
      reason: REASONS.errorValue(grading.targetCell, code, message.join(' ')),
      datasets,
    });
  }

  const failed = datasets.find((d) => !d.matched);
  const firstFailure = failed === undefined ? null : failed.label;
  const baseMatches = base.matched;
  const isFormula = isFormulaContent(content);
  const comparison: StructureComparison | null = isFormula
    ? compareStructure(content, grading.canonicalFormula, grading.targetSheet)
    : null;
  const ctx: ReasonContext = {
    cell: grading.targetCell,
    submitted,
    firstFailure,
    baseMatches,
    comparison,
  };
  const diagnosed = (diagnosis: GradingDiagnosis, passed: boolean, reason: string): GradingResult =>
    withFeedback(result({ passed, diagnosis, outcome: 'DIAGNOSED', reason, datasets }));

  // 1. 상수이거나 셀을 하나도 참조하지 않는 수식: 데이터가 바뀌어도 값이 따라오지 않는다.
  if (!isFormula || (comparison !== null && !comparison.hasReferences)) {
    const firstPerturbed = datasets.find((d) => d.kind !== 'BASE' && !d.matched);
    return diagnosed(
      'HARDCODED_VALUE',
      false,
      REASONS.hardcoded(
        { ...ctx, firstFailure: firstPerturbed?.label ?? firstFailure },
        !isFormula,
      ),
    );
  }

  // 2. $만 다른 수식: 제자리에서는 맞아도 복사하면 틀어진다.
  if (comparison?.absoluteOnlyDifference === true) {
    const baseSet = prepared[0];
    if (baseSet !== undefined && (await copyBreaks(baseSet, problem, content, createAdapter))) {
      return diagnosed('MISSING_ABSOLUTE_REF', false, REASONS.missingAbsoluteRef(ctx));
    }
  }

  // 3. 모든 데이터에서 일치
  if (failed === undefined) {
    const used = functionNamesOf(content);
    const forbidden = grading.forbiddenFunctions.filter((f) => used.has(f));
    if (forbidden.length > 0) {
      return result({
        passed: false,
        diagnosis: null,
        outcome: 'FORBIDDEN_FUNCTION_USED',
        reason: REASONS.forbiddenFunctionUsed(forbidden),
        datasets,
      });
    }
    const missing =
      grading.mode === 'REQUIRE_FUNCTION'
        ? grading.requiredFunctions.filter((f) => !used.has(f))
        : [];
    if (missing.length > 0) {
      return result({
        passed: false,
        diagnosis: null,
        outcome: 'REQUIRED_FUNCTION_MISSING',
        reason: REASONS.requiredFunctionMissing(missing),
        datasets,
      });
    }
    const known = [grading.canonicalFormula, problem.recommendedSolution.formula];
    const isStandard = known.some(
      (f) => f !== undefined && normalizeContent(f) === normalizeContent(content),
    );
    const passed = diagnosed(
      isStandard ? 'PASS' : 'ALTERNATE_FORMULA_PASS',
      true,
      isStandard ? REASONS.pass() : REASONS.alternate(),
    );
    const advice = rangeAdvice(comparison, submission.sheets[grading.targetSheet]);
    return advice === null ? passed : { ...passed, advice, reason: `${passed.reason} ${advice}` };
  }

  // 4. 일부 데이터에서 불일치: 골격은 같고 가리키는 범위만 다르면 범위 오류
  if (comparison?.referencesDiffer === true) {
    return diagnosed('INCOMPLETE_RANGE', false, REASONS.incompleteRange(ctx));
  }

  // 5. 지금 데이터에서만 맞는 수식
  if (baseMatches) {
    return diagnosed('DATA_DEPENDENT', false, REASONS.dataDependent(ctx));
  }

  return result({
    passed: false,
    diagnosis: null,
    outcome: 'WRONG_RESULT',
    reason: REASONS.wrongResult(ctx),
    datasets,
  });
}

import { columnLetters, columnNumber } from '@/engine/spreadsheet/operations/referenceShift';
import type {
  ExpectedAction,
  FailureReason,
  TutorialDefinition,
  TutorialStep,
} from '@/types/tutorial.schema';

/*
 * 튜토리얼 상태 머신 러너 (CARD-03A, MASTER_PROMPT §7.1).
 * 순수 함수 reducer라서 React 밖에서 테스트할 수 있다. XState 같은 외부 라이브러리는 쓰지 않는다.
 *
 * 단계가 넘어가는 경우는 두 가지뿐이다.
 *   1. ACTION 이벤트(실제 셀 조작의 결과)가 단계의 expectedAction과 맞을 때
 *   2. canSkip이 true인 단계를 SKIP 할 때 (완료가 아니라 "건너뜀"으로 기록)
 * NEXT 는 next.mode가 'confirm'이고 행동이 이미 맞은 단계에서만 효력이 있다(R-07.13).
 */

/** 화면(그리드·입력줄)이 실제 조작을 마친 뒤 러너에 알리는 사실. 채점에 쓰는 값은 호출한 쪽이 계산해서 넘긴다. */
export type TutorialActionEvent =
  | { type: 'SELECT_CELL'; sheetName: string; cell: string }
  | { type: 'SELECT_RANGE'; sheetName: string; range: string }
  | { type: 'ENTER_VALUE'; sheetName: string; cell: string; value: string | number | boolean }
  | {
      type: 'ENTER_FORMULA';
      sheetName: string;
      cell: string;
      /** 사용자가 입력한 수식 원문 */
      formula: string;
      /** 엔진이 계산한 결과 */
      computedValue: string | number | boolean | null;
    }
  | { type: 'PRESS_KEY'; key: string }
  | { type: 'CLICK_UI'; element: string }
  | { type: 'AUTOFILL_RANGE'; sheetName: string; range: string }
  /** 붙여넣기·채우기가 허용 셀 밖에 쓰려다 막힌 시도. 단계의 정답이 될 수 없고 틀린 시도로만 기록된다. */
  | { type: 'WRITE_RANGE'; sheetName: string; range: string }
  | { type: 'CHANGE_FORMAT'; sheetName: string; range: string; format: string };

export type TutorialEvent =
  | { type: 'START' }
  | { type: 'ACTION'; action: TutorialActionEvent }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SKIP' }
  | { type: 'HINT' }
  | { type: 'RESET' };

export interface StepFailure {
  reason: FailureReason;
  message: string;
}

export type TutorialState =
  | { status: 'idle' }
  | {
      status: 'active';
      stepIndex: number;
      /** 이 단계에서 틀린 횟수 */
      attempts: number;
      /** 지금까지 공개한 힌트 개수 */
      hintLevel: number;
      /** 행동은 맞았고 사용자의 '다음'만 기다리는 중 (next.mode가 confirm) */
      actionDone: boolean;
      lastFailure: StepFailure | null;
      completedStepIds: readonly string[];
      skippedStepIds: readonly string[];
    }
  | {
      status: 'completed';
      completedStepIds: readonly string[];
      skippedStepIds: readonly string[];
    };

export const INITIAL_TUTORIAL_STATE: TutorialState = { status: 'idle' };

const DEFAULT_FAILURE_MESSAGES: Record<FailureReason, string> = {
  WRONG_ACTION: '지금 단계에서 해야 할 조작이 아닙니다.',
  WRONG_TARGET: '다른 곳을 조작했습니다. 강조된 대상을 다시 확인하세요.',
  NOT_ALLOWED: '이 단계에서는 허용되지 않는 입력입니다.',
  NOT_A_FORMULA: "수식은 '='로 시작해야 합니다.",
  WRONG_VALUE: '입력한 값이 다릅니다.',
  WRONG_FORMULA: '수식의 모양이 다릅니다.',
  MISSING_FUNCTION: '필요한 함수를 사용하지 않았습니다.',
  WRONG_RESULT: '계산 결과가 다릅니다.',
};

/** 허용되지 않는 입력을 막을 때 보여 줄 문장 (단계의 NOT_ALLOWED 메시지, 없으면 기본 문장) */
export function notAllowedMessage(step: TutorialStep): string {
  return step.failure.messages.NOT_ALLOWED ?? DEFAULT_FAILURE_MESSAGES.NOT_ALLOWED;
}

/** 현재 단계 (활성 상태일 때만) */
export function currentStep(
  definition: TutorialDefinition,
  state: TutorialState,
): TutorialStep | null {
  return state.status === 'active' ? (definition.steps[state.stepIndex] ?? null) : null;
}

// ---- 주소·값 비교 -----------------------------------------------------------

interface CellPos {
  col: number;
  row: number;
}

function parseCell(text: string): CellPos | null {
  const match = /^\$?([A-Za-z]{1,3})\$?([1-9][0-9]{0,6})$/.exec(text.trim());
  if (match === null) return null;
  return { col: columnNumber((match[1] ?? '').toUpperCase()), row: Number(match[2]) };
}

function parseRange(text: string): { from: CellPos; to: CellPos } | null {
  const [a, b = a] = text.split(':');
  const from = parseCell(a ?? '');
  const to = parseCell(b ?? '');
  if (from === null || to === null) return null;
  return {
    from: { col: Math.min(from.col, to.col), row: Math.min(from.row, to.row) },
    to: { col: Math.max(from.col, to.col), row: Math.max(from.row, to.row) },
  };
}

function sameCell(a: string, b: string): boolean {
  const left = parseCell(a);
  const right = parseCell(b);
  return left !== null && right !== null && left.col === right.col && left.row === right.row;
}

function sameRange(a: string, b: string): boolean {
  const left = parseRange(a);
  const right = parseRange(b);
  return (
    left !== null &&
    right !== null &&
    left.from.col === right.from.col &&
    left.from.row === right.from.row &&
    left.to.col === right.to.col &&
    left.to.row === right.to.row
  );
}

function cellInRange(cell: string, range: string): boolean {
  const pos = parseCell(cell);
  const box = parseRange(range);
  return (
    pos !== null &&
    box !== null &&
    pos.col >= box.from.col &&
    pos.col <= box.to.col &&
    pos.row >= box.from.row &&
    pos.row <= box.to.row
  );
}

function sameSheet(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function sameKey(a: string, b: string): boolean {
  return a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase();
}

/** 따옴표 밖의 공백을 지우고 대문자로 바꾼다. 수식 모양 비교용. */
function normalizeFormula(formula: string): string {
  let out = '';
  let inString = false;
  for (const ch of formula.trim()) {
    if (ch === '"') inString = !inString;
    out += inString ? ch : ch.toUpperCase().replace(/\s/g, '');
  }
  return out.replace(/\$/g, '');
}

function sameResult(
  expected: string | number | boolean,
  actual: string | number | boolean | null,
): boolean {
  if (typeof expected === 'number' && typeof actual === 'number') {
    return Math.abs(expected - actual) <= 1e-9 * Math.max(1, Math.abs(expected));
  }
  return expected === actual;
}

// ---- 행동 판정 -------------------------------------------------------------

type Verdict = { ok: true } | { ok: false; reason: FailureReason };

const FAIL = (reason: FailureReason): Verdict => ({ ok: false, reason });
const PASS: Verdict = { ok: true };

/** 셀이 허용 셀 목록 안에 있는가. 목록이 비어 있으면 제한 없음. 셀 입력과 범위 쓰기가 같은 기준을 쓴다. */
function cellAllowed(allowed: readonly string[], cell: string): boolean {
  return allowed.length === 0 || allowed.some((range) => cellInRange(cell, range));
}

/** 범위의 모든 셀이 허용 셀 안에 있는가 (붙여넣기·채우기 대상 범위 검사) */
function rangeAllowed(allowed: readonly string[], range: string): boolean {
  if (allowed.length === 0) return true;
  const box = parseRange(range);
  if (box === null) return false;
  for (let row = box.from.row; row <= box.to.row; row += 1) {
    for (let col = box.from.col; col <= box.to.col; col += 1) {
      if (!allowed.some((candidate) => cellInRange(`${columnLetters(col - 1)}${row}`, candidate))) {
        return false;
      }
    }
  }
  return true;
}

export function violatesAllowedInput(step: TutorialStep, event: TutorialActionEvent): boolean {
  const { cells, keys } = step.allowedInput;
  if (
    (event.type === 'ENTER_VALUE' || event.type === 'ENTER_FORMULA') &&
    !cellAllowed(cells, event.cell)
  ) {
    return true;
  }
  if (event.type === 'WRITE_RANGE' && !rangeAllowed(cells, event.range)) return true;
  return keys.length > 0 && event.type === 'PRESS_KEY' && !keys.some((k) => sameKey(k, event.key));
}

function judgeFormula(
  expected: Extract<ExpectedAction, { type: 'ENTER_FORMULA' }>,
  event: Extract<TutorialActionEvent, { type: 'ENTER_FORMULA' }>,
): Verdict {
  if (!event.formula.trim().startsWith('=')) return FAIL('NOT_A_FORMULA');
  const typed = normalizeFormula(event.formula);
  for (const name of expected.requiredFunctions) {
    if (!new RegExp(`(?:^|[^A-Z0-9._])${name.replace(/\./g, '\\.')}\\(`).test(typed)) {
      return FAIL('MISSING_FUNCTION');
    }
  }
  if (expected.requireExactFormula && typed !== normalizeFormula(expected.canonicalFormula)) {
    return FAIL('WRONG_FORMULA');
  }
  if (expected.expectedFormulaPattern !== undefined) {
    const matchesPattern = new RegExp(expected.expectedFormulaPattern, 'i').test(typed);
    if (!matchesPattern && typed !== normalizeFormula(expected.canonicalFormula)) {
      return FAIL('WRONG_FORMULA');
    }
  }
  if (
    expected.expectedResult !== undefined &&
    !sameResult(expected.expectedResult, event.computedValue)
  ) {
    return FAIL('WRONG_RESULT');
  }
  return PASS;
}

/** 단계의 expectedAction과 실제 조작이 맞는지 판정한다. */
export function judgeAction(step: TutorialStep, event: TutorialActionEvent): Verdict {
  const expected = step.expectedAction;
  // 허용 입력 밖이면 종류가 달라도 먼저 NOT_ALLOWED로 본다(R-07.06, 화면 차단과 같은 기준)
  if (violatesAllowedInput(step, event)) return FAIL('NOT_ALLOWED');
  if (expected.type !== event.type) return FAIL('WRONG_ACTION');

  switch (expected.type) {
    case 'SELECT_CELL':
      return event.type === 'SELECT_CELL' &&
        sameSheet(expected.sheetName, event.sheetName) &&
        sameCell(expected.cell, event.cell)
        ? PASS
        : FAIL('WRONG_TARGET');
    case 'SELECT_RANGE':
      return event.type === 'SELECT_RANGE' &&
        sameSheet(expected.sheetName, event.sheetName) &&
        sameRange(expected.range, event.range)
        ? PASS
        : FAIL('WRONG_TARGET');
    case 'AUTOFILL_RANGE':
      return event.type === 'AUTOFILL_RANGE' &&
        sameSheet(expected.sheetName, event.sheetName) &&
        sameRange(expected.range, event.range)
        ? PASS
        : FAIL('WRONG_TARGET');
    case 'ENTER_VALUE':
      if (event.type !== 'ENTER_VALUE') return FAIL('WRONG_ACTION');
      if (!sameSheet(expected.sheetName, event.sheetName) || !sameCell(expected.cell, event.cell)) {
        return FAIL('WRONG_TARGET');
      }
      return expected.value === event.value ? PASS : FAIL('WRONG_VALUE');
    case 'ENTER_FORMULA':
      if (event.type !== 'ENTER_FORMULA') return FAIL('WRONG_ACTION');
      if (!sameSheet(expected.sheetName, event.sheetName) || !sameCell(expected.cell, event.cell)) {
        return FAIL('WRONG_TARGET');
      }
      return judgeFormula(expected, event);
    case 'PRESS_KEY':
      return event.type === 'PRESS_KEY' && expected.keys.some((k) => sameKey(k, event.key))
        ? PASS
        : FAIL('WRONG_TARGET');
    case 'CLICK_UI':
      return event.type === 'CLICK_UI' && expected.element === event.element
        ? PASS
        : FAIL('WRONG_TARGET');
    case 'CHANGE_FORMAT':
      if (event.type !== 'CHANGE_FORMAT') return FAIL('WRONG_ACTION');
      if (
        !sameSheet(expected.sheetName, event.sheetName) ||
        !sameRange(expected.range, event.range)
      ) {
        return FAIL('WRONG_TARGET');
      }
      return expected.format === event.format ? PASS : FAIL('WRONG_VALUE');
  }
}

// ---- 전이 ------------------------------------------------------------------

type ActiveState = Extract<TutorialState, { status: 'active' }>;

function enterStep(
  definition: TutorialDefinition,
  stepIndex: number,
  completedStepIds: readonly string[],
  skippedStepIds: readonly string[],
): TutorialState {
  if (stepIndex >= definition.steps.length) {
    return { status: 'completed', completedStepIds, skippedStepIds };
  }
  return {
    status: 'active',
    stepIndex,
    attempts: 0,
    hintLevel: 0,
    actionDone: false,
    lastFailure: null,
    completedStepIds,
    skippedStepIds,
  };
}

function without(ids: readonly string[], id: string): readonly string[] {
  return ids.filter((existing) => existing !== id);
}

function handleAction(
  definition: TutorialDefinition,
  state: ActiveState,
  step: TutorialStep,
  action: TutorialActionEvent,
): TutorialState {
  if (state.actionDone) return state;
  const verdict = judgeAction(step, action);
  if (!verdict.ok) {
    const attempts = state.attempts + 1;
    const hintLevel =
      attempts >= step.failure.autoHintAfterAttempts
        ? Math.min(step.hints.length, state.hintLevel + 1)
        : state.hintLevel;
    return {
      ...state,
      attempts,
      hintLevel,
      lastFailure: {
        reason: verdict.reason,
        message: step.failure.messages[verdict.reason] ?? DEFAULT_FAILURE_MESSAGES[verdict.reason],
      },
    };
  }
  const completedStepIds = [...without(state.completedStepIds, step.id), step.id];
  const skippedStepIds = without(state.skippedStepIds, step.id);
  if (step.next.mode === 'confirm') {
    return { ...state, actionDone: true, lastFailure: null, completedStepIds, skippedStepIds };
  }
  return enterStep(definition, state.stepIndex + 1, completedStepIds, skippedStepIds);
}

function handleBack(definition: TutorialDefinition, state: ActiveState, step: TutorialStep) {
  if (!step.back.allowed || state.stepIndex === 0) return state;
  const targetIndex =
    step.back.to === undefined
      ? state.stepIndex - 1
      : definition.steps.findIndex((candidate) => candidate.id === step.back.to);
  if (targetIndex < 0 || targetIndex >= state.stepIndex) return state;
  return enterStep(definition, targetIndex, state.completedStepIds, state.skippedStepIds);
}

/**
 * 상태 전이. 허용되지 않는 이벤트는 같은 state 객체를 그대로 돌려준다(참조 동일).
 * definition은 TutorialDefinitionSchema.parse 를 통과한 값이어야 한다.
 */
export function tutorialReducer(
  definition: TutorialDefinition,
  state: TutorialState,
  event: TutorialEvent,
): TutorialState {
  if (event.type === 'START' || event.type === 'RESET') {
    return enterStep(definition, 0, [], []);
  }
  if (state.status !== 'active') return state;
  const step = definition.steps[state.stepIndex];
  if (step === undefined) return state;

  switch (event.type) {
    case 'ACTION':
      return handleAction(definition, state, step, event.action);
    case 'NEXT':
      // 행동이 맞았다고 확인된 confirm 단계에서만 넘어간다. 설명창의 '다음'만으로는 완료되지 않는다.
      return step.next.mode === 'confirm' && state.actionDone
        ? enterStep(definition, state.stepIndex + 1, state.completedStepIds, state.skippedStepIds)
        : state;
    case 'BACK':
      return handleBack(definition, state, step);
    case 'SKIP':
      return step.canSkip
        ? enterStep(definition, state.stepIndex + 1, without(state.completedStepIds, step.id), [
            ...without(state.skippedStepIds, step.id),
            step.id,
          ])
        : state;
    case 'HINT':
      return state.hintLevel < step.hints.length
        ? { ...state, hintLevel: state.hintLevel + 1 }
        : state;
  }
}

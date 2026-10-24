import { describe, expect, it } from 'vitest';

import {
  detectTutorialAction,
  filledRange,
  guardMessage,
  normalizeKey,
  shouldForwardToRunner,
} from '@/engine/tutorials/actionDetector';
import type { GridUserAction } from '@/engine/tutorials/actionDetector';
import { INITIAL_TUTORIAL_STATE, tutorialReducer } from '@/engine/tutorials/tutorialRunner';
import type { TutorialEvent, TutorialState } from '@/engine/tutorials/tutorialRunner';

import { buildSampleTutorial } from './sampleTutorial';

const definition = buildSampleTutorial();
const [selectStep, sumStep] = definition.steps;
if (selectStep === undefined || sumStep === undefined) {
  throw new Error('샘플 튜토리얼 단계가 없습니다');
}

const cellRange = (row: number, col: number) => ({
  startRow: row,
  startCol: col,
  endRow: row,
  endCol: col,
});

const commit = (
  row: number,
  col: number,
  input: string,
  computedValue: string | number | boolean | null = null,
  composing = false,
): GridUserAction => ({
  type: 'cellCommitted',
  composing,
  sheet: 'Sheet1',
  row,
  col,
  input,
  computedValue,
});

const select = (row: number, col: number): GridUserAction => ({
  type: 'selectionChanged',
  composing: false,
  sheet: 'Sheet1',
  range: cellRange(row, col),
});

/** 그리드 조작을 감지기 → 러너 순서로 흘려 보낸다 (화면 연결과 같은 경로) */
function play(actions: readonly GridUserAction[], from?: TutorialState): TutorialState {
  let state = from ?? tutorialReducer(definition, INITIAL_TUTORIAL_STATE, { type: 'START' });
  for (const action of actions) {
    if (state.status !== 'active') break;
    const step = definition.steps[state.stepIndex];
    const event = detectTutorialAction(action);
    if (step === undefined || event === null || !shouldForwardToRunner(step, event)) continue;
    state = tutorialReducer(definition, state, { type: 'ACTION', action: event });
  }
  return state;
}

const atSum = (): TutorialState => play([select(1, 1)]);

describe('detectTutorialAction: 조작 → 러너 이벤트', () => {
  it('한 칸 선택은 SELECT_CELL, 여러 칸은 SELECT_RANGE', () => {
    expect(detectTutorialAction(select(1, 1))).toEqual({
      type: 'SELECT_CELL',
      sheetName: 'Sheet1',
      cell: 'B2',
    });
    expect(
      detectTutorialAction({
        type: 'selectionChanged',
        composing: false,
        sheet: 'Sheet1',
        range: { startRow: 2, startCol: 1, endRow: 6, endCol: 1 },
      }),
    ).toEqual({ type: 'SELECT_RANGE', sheetName: 'Sheet1', range: 'B3:B7' });
  });

  it('= 로 시작하는 입력은 ENTER_FORMULA(계산 결과 포함), 아니면 ENTER_VALUE(숫자는 숫자로)', () => {
    expect(detectTutorialAction(commit(1, 1, '=SUM(B3:B7)', 150))).toEqual({
      type: 'ENTER_FORMULA',
      sheetName: 'Sheet1',
      cell: 'B2',
      formula: '=SUM(B3:B7)',
      computedValue: 150,
    });
    expect(detectTutorialAction(commit(1, 1, '150'))).toMatchObject({
      type: 'ENTER_VALUE',
      value: 150,
    });
    expect(detectTutorialAction(commit(1, 1, '사과'))).toMatchObject({ value: '사과' });
    expect(detectTutorialAction(commit(1, 1, 'true'))).toMatchObject({ value: true });
  });

  it('포인트 모드로 고른 범위, 채우기, UI 클릭도 변환한다', () => {
    expect(
      detectTutorialAction({
        type: 'pointModeEnded',
        composing: false,
        sheet: 'Sheet1',
        range: { startRow: 2, startCol: 1, endRow: 6, endCol: 1 },
      }),
    ).toEqual({ type: 'SELECT_RANGE', sheetName: 'Sheet1', range: 'B3:B7' });
    expect(
      detectTutorialAction({
        type: 'filled',
        composing: false,
        sheet: 'Sheet1',
        range: filledRange(cellRange(0, 0), 'down', 4),
      }),
    ).toEqual({ type: 'AUTOFILL_RANGE', sheetName: 'Sheet1', range: 'A1:A5' });
    expect(
      detectTutorialAction({ type: 'uiClicked', composing: false, element: 'undo-button' }),
    ).toEqual({ type: 'CLICK_UI', element: 'undo-button' });
  });

  it('한글 조합 중 조작은 러너 이벤트가 되지 않는다', () => {
    expect(detectTutorialAction({ type: 'keyPressed', composing: true, key: 'F2' })).toBeNull();
    expect(detectTutorialAction(commit(1, 1, '=SUM(B3:B7)', 150, true))).toBeNull();
    expect(
      detectTutorialAction({
        type: 'selectionChanged',
        composing: true,
        sheet: 'Sheet1',
        range: cellRange(1, 1),
      }),
    ).toBeNull();
  });
});

describe('normalizeKey', () => {
  const key = (
    k: string,
    mods: Partial<Record<'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey', boolean>> = {},
  ) =>
    normalizeKey({
      key: k,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      ...mods,
    });

  it('단축키는 단계 정의의 표기로 바꾼다', () => {
    expect(key('F2')).toBe('F2');
    expect(key('z', { ctrlKey: true })).toBe('Ctrl+Z');
    expect(key('Z', { ctrlKey: true, shiftKey: true })).toBe('Ctrl+Shift+Z');
    expect(key('d', { metaKey: true })).toBe('Ctrl+D');
  });

  it('수정 키만 누르거나 글자를 그냥 입력한 것은 단축키가 아니다', () => {
    expect(key('Control', { ctrlKey: true })).toBeNull();
    expect(key('a')).toBeNull();
    expect(key('한')).toBeNull();
  });
});

describe('실제 조작이 끝났을 때만 단계가 넘어간다', () => {
  it('B2를 선택해야 다음 단계로 간다. 다른 셀 선택은 틀린 대상으로 안내한다', () => {
    const state = play([select(0, 0), select(1, 1)]);
    expect(state).toMatchObject({ status: 'active', stepIndex: 1 });
    expect(play([select(0, 0)])).toMatchObject({
      stepIndex: 0,
      lastFailure: { reason: 'WRONG_TARGET' },
    });
  });

  it('다른 종류를 기다리는 단계에서 셀을 돌아다니는 것은 틀린 시도로 세지 않는다', () => {
    expect(play([select(9, 9), select(3, 3)], atSum())).toMatchObject({
      stepIndex: 1,
      attempts: 0,
      lastFailure: null,
    });
  });

  it('B2에 =SUM(B3:B7)을 넣고 결과 150이어야 통과한다', () => {
    expect(play([commit(1, 1, '=SUM(B3:B7)', 150)], atSum())).toMatchObject({
      stepIndex: 1,
      actionDone: true,
      lastFailure: null,
    });
  });

  it('결과가 다르거나 다른 셀·다른 수식·상수 입력이면 통과하지 못한다', () => {
    expect(play([commit(1, 1, '=SUM(B3:B7)', 149)], atSum())).toMatchObject({
      actionDone: false,
      lastFailure: { reason: 'WRONG_RESULT' },
    });
    expect(play([commit(2, 1, '=SUM(B3:B7)', 150)], atSum())).toMatchObject({
      actionDone: false,
      lastFailure: { reason: 'NOT_ALLOWED' },
    });
    expect(play([commit(1, 1, '=B3+B4', 150)], atSum())).toMatchObject({
      actionDone: false,
      lastFailure: { reason: 'MISSING_FUNCTION' },
    });
    expect(play([commit(1, 1, '150')], atSum())).toMatchObject({
      actionDone: false,
      lastFailure: { reason: 'WRONG_ACTION' },
    });
  });

  it('조합 중 입력은 단계를 바꾸지 않는다', () => {
    expect(play([commit(1, 1, '=SUM(B3:B7)', 150, true)], atSum())).toMatchObject({
      actionDone: false,
      attempts: 0,
    });
  });

  it('다음 버튼 이벤트만으로는 넘어가지 않는다 (행동 전 / 행동 뒤 확인 후에만)', () => {
    const next: TutorialEvent = { type: 'NEXT' };
    const start = tutorialReducer(definition, INITIAL_TUTORIAL_STATE, { type: 'START' });
    expect(tutorialReducer(definition, start, next)).toBe(start);
    const beforeAction = atSum();
    expect(tutorialReducer(definition, beforeAction, next)).toBe(beforeAction);
    const done = play([commit(1, 1, '=SUM(B3:B7)', 150)], beforeAction);
    expect(tutorialReducer(definition, done, next)).toMatchObject({ stepIndex: 2 });
  });

  it('단축키 단계는 맞는 키만 통과한다', () => {
    const atKey = tutorialReducer(definition, play([commit(1, 1, '=SUM(B3:B7)', 150)], atSum()), {
      type: 'NEXT',
    });
    expect(play([{ type: 'keyPressed', composing: false, key: 'Ctrl+D' }], atKey)).toMatchObject({
      stepIndex: 2,
      lastFailure: { reason: 'WRONG_TARGET' },
    });
    expect(play([{ type: 'keyPressed', composing: false, key: 'F2' }], atKey)).toMatchObject({
      status: 'completed',
    });
  });
});

describe('guardMessage: 허용 입력 밖 조작 차단', () => {
  it('허용 셀 밖 입력은 막고 허용 셀 입력은 막지 않는다', () => {
    expect(guardMessage(sumStep, commit(2, 1, '=SUM(B3:B7)'))).not.toBeNull();
    expect(guardMessage(sumStep, commit(1, 1, '=SUM(B3:B7)'))).toBeNull();
  });

  it('허용 입력이 없는 단계와 셀 이동은 막지 않는다', () => {
    expect(guardMessage(selectStep, commit(5, 5, 'x'))).toBeNull();
    expect(guardMessage(sumStep, select(9, 9))).toBeNull();
  });
});

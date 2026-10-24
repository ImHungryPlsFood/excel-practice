import { describe, expect, it } from 'vitest';

import {
  currentStep,
  INITIAL_TUTORIAL_STATE,
  tutorialReducer,
} from '@/engine/tutorials/tutorialRunner';
import type { TutorialEvent, TutorialState } from '@/engine/tutorials/tutorialRunner';

import { buildSampleTutorial } from './sampleTutorial';

const definition = buildSampleTutorial();

function run(events: TutorialEvent[], from: TutorialState = INITIAL_TUTORIAL_STATE) {
  return events.reduce((state, event) => tutorialReducer(definition, state, event), from);
}

const selectB2: TutorialEvent = {
  type: 'ACTION',
  action: { type: 'SELECT_CELL', sheetName: 'Sheet1', cell: 'B2' },
};
const sumB2 = (formula: string, computedValue: number): TutorialEvent => ({
  type: 'ACTION',
  action: { type: 'ENTER_FORMULA', sheetName: 'Sheet1', cell: 'B2', formula, computedValue },
});

describe('tutorialRunner — 시작과 로드', () => {
  it('시작 전에는 idle이고 START로 첫 단계가 활성화된다', () => {
    expect(INITIAL_TUTORIAL_STATE.status).toBe('idle');
    const state = run([{ type: 'START' }]);
    expect(state).toMatchObject({ status: 'active', stepIndex: 0, attempts: 0, hintLevel: 0 });
    expect(currentStep(definition, state)?.id).toBe('select-b2');
  });

  it('시작 전의 이벤트는 무시한다', () => {
    expect(run([selectB2, { type: 'NEXT' }])).toBe(INITIAL_TUTORIAL_STATE);
  });
});

describe('tutorialRunner — 올바른 이벤트에서만 전이 (R-07.05~R-07.10)', () => {
  it('맞는 조작이면 다음 단계로 가고 완료 기록을 남긴다', () => {
    const state = run([{ type: 'START' }, selectB2]);
    expect(state).toMatchObject({
      status: 'active',
      stepIndex: 1,
      completedStepIds: ['select-b2'],
    });
  });

  it('다른 셀을 고르면 전이하지 않고 실패 안내와 시도 횟수를 기록한다', () => {
    const state = run([
      { type: 'START' },
      { type: 'ACTION', action: { type: 'SELECT_CELL', sheetName: 'Sheet1', cell: 'C2' } },
    ]);
    expect(state).toMatchObject({
      stepIndex: 0,
      attempts: 1,
      lastFailure: { reason: 'WRONG_TARGET', message: 'B2 셀을 선택해야 합니다.' },
    });
  });

  it('다른 종류의 조작은 WRONG_ACTION 으로 실패한다', () => {
    const state = run([
      { type: 'START' },
      { type: 'ACTION', action: { type: 'PRESS_KEY', key: 'F2' } },
    ]);
    expect(state).toMatchObject({ stepIndex: 0, lastFailure: { reason: 'WRONG_ACTION' } });
  });

  it('시트 이름이 다르면 같은 셀이어도 전이하지 않는다', () => {
    const state = run([
      { type: 'START' },
      { type: 'ACTION', action: { type: 'SELECT_CELL', sheetName: 'Sheet2', cell: 'B2' } },
    ]);
    expect(state).toMatchObject({ stepIndex: 0, lastFailure: { reason: 'WRONG_TARGET' } });
  });

  it('주소의 대소문자·$ 표기 차이는 같은 셀로 본다', () => {
    const state = run([
      { type: 'START' },
      { type: 'ACTION', action: { type: 'SELECT_CELL', sheetName: 'sheet1', cell: '$b$2' } },
    ]);
    expect(state).toMatchObject({ stepIndex: 1 });
  });
});

describe('tutorialRunner — 수식 입력 판정', () => {
  const atFormula = run([{ type: 'START' }, selectB2]);

  it('수식과 계산 결과가 모두 맞아야 통과한다 (confirm 단계는 행동 완료 상태가 된다)', () => {
    const state = run([sumB2('=sum(b3:b7)', 150)], atFormula);
    expect(state).toMatchObject({ stepIndex: 1, actionDone: true });
  });

  it('값만 입력하면 NOT_A_FORMULA', () => {
    expect(run([sumB2('150', 150)], atFormula)).toMatchObject({
      lastFailure: { reason: 'NOT_A_FORMULA' },
    });
  });

  it('필수 함수 없이 상수식으로 같은 결과를 만들면 MISSING_FUNCTION', () => {
    expect(run([sumB2('=100+50', 150)], atFormula)).toMatchObject({
      actionDone: false,
      lastFailure: { reason: 'MISSING_FUNCTION' },
    });
  });

  it('범위가 달라 모양이 다르면 WRONG_FORMULA', () => {
    expect(run([sumB2('=SUM(B3:B6)', 150)], atFormula)).toMatchObject({
      lastFailure: { reason: 'WRONG_FORMULA' },
    });
  });

  it('수식 모양은 맞지만 결과가 다르면 WRONG_RESULT', () => {
    expect(run([sumB2('=SUM(B3:B7)', 149)], atFormula)).toMatchObject({
      lastFailure: { reason: 'WRONG_RESULT' },
    });
  });

  it('허용 입력 밖의 셀에 입력하면 NOT_ALLOWED', () => {
    const state = run(
      [
        {
          type: 'ACTION',
          action: {
            type: 'ENTER_FORMULA',
            sheetName: 'Sheet1',
            cell: 'C2',
            formula: '=SUM(B3:B7)',
            computedValue: 150,
          },
        },
      ],
      atFormula,
    );
    expect(state).toMatchObject({ lastFailure: { reason: 'NOT_ALLOWED' } });
  });
});

describe("tutorialRunner — '다음' 버튼만으로는 완료되지 않는다 (R-07.13)", () => {
  it('행동 전의 NEXT는 상태를 바꾸지 않는다', () => {
    const start = run([{ type: 'START' }]);
    expect(tutorialReducer(definition, start, { type: 'NEXT' })).toBe(start);
    const atFormula = run([selectB2], start);
    expect(tutorialReducer(definition, atFormula, { type: 'NEXT' })).toBe(atFormula);
  });

  it('confirm 단계는 행동이 맞은 뒤 NEXT를 눌러야 넘어간다', () => {
    const done = run([{ type: 'START' }, selectB2, sumB2('=SUM(B3:B7)', 150)]);
    expect(done).toMatchObject({ stepIndex: 1, actionDone: true });
    const next = tutorialReducer(definition, done, { type: 'NEXT' });
    expect(next).toMatchObject({ stepIndex: 2, completedStepIds: ['select-b2', 'type-sum'] });
  });

  it('행동이 끝난 confirm 단계에서 같은 조작을 반복해도 기록이 늘지 않는다', () => {
    const done = run([{ type: 'START' }, selectB2, sumB2('=SUM(B3:B7)', 150)]);
    expect(tutorialReducer(definition, done, sumB2('=SUM(B3:B7)', 150))).toBe(done);
  });

  it('NEXT는 auto 단계의 완료를 대신하지 못한다', () => {
    const lastStep = run([
      { type: 'START' },
      selectB2,
      sumB2('=SUM(B3:B7)', 150),
      { type: 'NEXT' },
    ]);
    expect(tutorialReducer(definition, lastStep, { type: 'NEXT' })).toBe(lastStep);
  });
});

describe('tutorialRunner — 힌트 (R-07.09)', () => {
  it('HINT는 준비된 힌트 수까지만 하나씩 공개한다', () => {
    const start = run([{ type: 'START' }]);
    const once = tutorialReducer(definition, start, { type: 'HINT' });
    expect(once).toMatchObject({ hintLevel: 1 });
    expect(tutorialReducer(definition, once, { type: 'HINT' })).toBe(once);
  });

  it('실패가 기준 횟수에 이르면 힌트가 자동으로 공개된다', () => {
    const wrong = sumB2('=SUM(B3:B6)', 150);
    const state = run([{ type: 'START' }, selectB2, wrong, wrong]);
    expect(state).toMatchObject({ attempts: 2, hintLevel: 1 });
  });

  it('힌트가 없는 단계에서는 HINT가 효력이 없다', () => {
    const atKey = run([{ type: 'START' }, selectB2, sumB2('=SUM(B3:B7)', 150), { type: 'NEXT' }]);
    expect(tutorialReducer(definition, atKey, { type: 'HINT' })).toBe(atKey);
  });
});

describe('tutorialRunner — 이전 단계·건너뛰기 (R-07.11, R-07.12)', () => {
  it('BACK은 바로 앞 단계로 돌아가며 그 단계의 시도·힌트를 초기화한다', () => {
    const state = run([{ type: 'START' }, selectB2, { type: 'BACK' }]);
    expect(state).toMatchObject({ stepIndex: 0, attempts: 0, hintLevel: 0 });
  });

  it('첫 단계에서는 BACK이 효력이 없다', () => {
    const start = run([{ type: 'START' }]);
    expect(tutorialReducer(definition, start, { type: 'BACK' })).toBe(start);
  });

  it('back.allowed가 false인 단계에서는 돌아갈 수 없다', () => {
    const atKey = run([{ type: 'START' }, selectB2, sumB2('=SUM(B3:B7)', 150), { type: 'NEXT' }]);
    expect(tutorialReducer(definition, atKey, { type: 'BACK' })).toBe(atKey);
  });

  it('canSkip이 true인 단계는 건너뛸 수 있고 완료가 아니라 건너뜀으로 기록된다', () => {
    const state = run([{ type: 'START' }, { type: 'SKIP' }]);
    expect(state).toMatchObject({
      stepIndex: 1,
      completedStepIds: [],
      skippedStepIds: ['select-b2'],
    });
  });

  it('canSkip이 false인 단계는 SKIP을 거부한다', () => {
    const atFormula = run([{ type: 'START' }, selectB2]);
    expect(tutorialReducer(definition, atFormula, { type: 'SKIP' })).toBe(atFormula);
  });
});

describe('tutorialRunner — 완료와 재시작', () => {
  const finished = run([
    { type: 'START' },
    selectB2,
    sumB2('=SUM(B3:B7)', 150),
    { type: 'NEXT' },
    { type: 'ACTION', action: { type: 'PRESS_KEY', key: 'f2' } },
  ]);

  it('마지막 단계의 올바른 조작으로 completed가 된다', () => {
    expect(finished).toEqual({
      status: 'completed',
      completedStepIds: ['select-b2', 'type-sum', 'press-f2'],
      skippedStepIds: [],
    });
    expect(currentStep(definition, finished)).toBeNull();
  });

  it('완료 뒤의 이벤트는 무시하고 RESET은 처음부터 다시 시작한다', () => {
    expect(tutorialReducer(definition, finished, selectB2)).toBe(finished);
    expect(tutorialReducer(definition, finished, { type: 'RESET' })).toMatchObject({
      status: 'active',
      stepIndex: 0,
      completedStepIds: [],
    });
  });
});

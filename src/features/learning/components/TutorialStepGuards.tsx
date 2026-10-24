import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  blockedWriteEvent,
  detectTutorialAction,
  guardMessage,
  shouldForwardToRunner,
} from '@/engine/tutorials/actionDetector';
import type { GridUserAction } from '@/engine/tutorials/actionDetector';

import { MotionWrapper } from '@/components/tutorial/MotionWrapper';

import { useTutorial } from '../context/useTutorial';

/*
 * 튜토리얼 단계 강제 검증기 (CARD-03B, R-01.06, R-07.01, R-07.06, R-07.13).
 * 스프레드시트가 알리는 실제 조작을 러너에 전달하고(onUserAction), 허용 입력 밖의 조작을 화면에서 막는다(inputGuard).
 * 단계가 넘어가는 길은 러너의 ACTION 판정뿐이다. 이 파일은 '다음'이나 임의 버튼으로 단계를 넘기는 이벤트를 만들지 않는다.
 *
 * 사용: const { onUserAction, inputGuard } = useTutorialGuards();
 *       <Spreadsheet onUserAction={onUserAction} inputGuard={inputGuard} … />
 */

export interface TutorialGuards {
  onUserAction: (action: GridUserAction) => void;
  inputGuard: (action: GridUserAction) => string | null;
}

export function useTutorialGuards(): TutorialGuards {
  const { step, dispatch } = useTutorial();

  const onUserAction = useCallback(
    (action: GridUserAction) => {
      if (step === null) return;
      const event = detectTutorialAction(action);
      if (event === null || !shouldForwardToRunner(step, event)) return;
      dispatch({ type: 'ACTION', action: event });
    },
    [step, dispatch],
  );

  const inputGuard = useCallback(
    (action: GridUserAction): string | null => {
      if (step === null || action.composing) return null;
      const refused = guardMessage(step, action);
      if (refused !== null && action.type === 'rangeWrite') {
        // 허용 셀 밖 붙여넣기·채우기도 틀린 시도로 기록한다.
        const event = blockedWriteEvent(step, action);
        if (event !== null) dispatch({ type: 'ACTION', action: event });
      }
      if (refused !== null && action.type === 'cellCommitted') {
        // 막은 입력도 틀린 시도로 기록한다(반영되지 않으므로 onUserAction이 불리지 않는다).
        const event = detectTutorialAction(action);
        if (event !== null) dispatch({ type: 'ACTION', action: event });
      }
      return refused;
    },
    [step, dispatch],
  );

  return useMemo(() => ({ onUserAction, inputGuard }), [onUserAction, inputGuard]);
}

/**
 * 현재 단계 안내: 진행 상황, 제목·설명, 결과 안내, 힌트, 이전·건너뛰기, '다음' (CARD-03C에서 말풍선 본문으로 확장).
 * '다음'은 행동이 맞은 confirm 단계에서만 눌린다. 행동을 하기 전에는 눌러도 아무 일도 없도록 비활성이며,
 * 러너도 같은 조건에서만 NEXT를 받아들인다.
 *
 * onStepChange: '다음'·이전·건너뛰기로 단계가 실제로 바뀐 직후 한 번 불린다(R-07.13 후속).
 * 학습 화면은 여기서 그리드로 포커스를 돌려, 버튼에 남은 포커스 때문에 이어지는 단축키(Ctrl+Z 등)가 그리드에 닿지 않는 일을 막는다.
 * 단계가 바뀌지 않으면(러너가 이벤트를 무시) 불리지 않는다.
 */
export function TutorialStepGuards({
  onStepChange,
  titleId,
}: {
  onStepChange?: () => void;
  /** 제목 요소 id (말풍선의 aria-labelledby) */
  titleId?: string;
}) {
  const { state, step, definition, dispatch } = useTutorial();
  const pendingRef = useRef<{ stepIndex: number } | null>(null);

  useEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    if (state.status !== 'active' || state.stepIndex !== pending.stepIndex) onStepChange?.();
  }, [state, onStepChange]);

  if (state.status !== 'active' || step === null) return null;

  const send = (event: { type: 'NEXT' } | { type: 'BACK' } | { type: 'SKIP' }) => {
    pendingRef.current = { stepIndex: state.stepIndex };
    dispatch(event);
  };
  const total = definition.steps.length;
  const waitingForNext = state.actionDone && step.next.mode === 'confirm';
  const canBack = step.back.allowed && state.stepIndex > 0;
  const shownHints = step.hints.slice(0, state.hintLevel);
  const hintsLeft = state.hintLevel < step.hints.length;
  return (
    <MotionWrapper
      key={state.stepIndex}
      className="flex flex-col gap-2"
      data-testid="tutorial-step-guards"
    >
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <span data-testid="tutorial-callout-progress">
          단계 {state.stepIndex + 1}/{total}
        </span>
        <progress
          aria-label="튜토리얼 진행률"
          className="h-1.5 flex-1 accent-brand"
          max={total}
          value={state.completedStepIds.length + state.skippedStepIds.length}
        />
      </div>
      <p id={titleId} className="text-sm font-semibold" data-testid="tutorial-step-title">
        {step.title}
      </p>
      <p className="text-sm text-fg-secondary">{step.description}</p>
      {state.lastFailure !== null && (
        <p
          key={state.attempts}
          role="alert"
          className="cc-fade-in text-sm text-error"
          data-testid="tutorial-failure"
        >
          {state.lastFailure.message}
        </p>
      )}
      {waitingForNext && (
        <p role="status" className="cc-fade-in text-sm text-success">
          {step.successMessage}
        </p>
      )}
      {shownHints.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-fg-secondary" data-testid="tutorial-hints">
          {shownHints.map((hint, index) => (
            <li key={index} className="cc-fade-in">
              {hint}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {canBack && (
          <button type="button" onClick={() => send({ type: 'BACK' })} className={BUTTON}>
            이전
          </button>
        )}
        {step.hints.length > 0 && (
          // 마지막 힌트를 연 뒤에도 버튼을 없애지 않는다(aria-disabled). 없애면 키보드 포커스가 문서 밖으로 사라진다.
          <button
            type="button"
            aria-disabled={hintsLeft ? undefined : true}
            onClick={() => {
              if (hintsLeft) dispatch({ type: 'HINT' });
            }}
            className={`${BUTTON} aria-disabled:cursor-not-allowed aria-disabled:opacity-50`}
          >
            힌트 보기 ({state.hintLevel}/{step.hints.length})
          </button>
        )}
        {step.canSkip && (
          <button type="button" onClick={() => send({ type: 'SKIP' })} className={BUTTON}>
            건너뛰기
          </button>
        )}
        {step.next.mode === 'confirm' && (
          <button
            type="button"
            disabled={!waitingForNext}
            onClick={() => send({ type: 'NEXT' })}
            className={`${BUTTON} ml-auto`}
          >
            다음
          </button>
        )}
      </div>
    </MotionWrapper>
  );
}

const BUTTON =
  'rounded-md border border-line px-3 py-1 text-sm hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50';

/** 전체 단계 목록과 각 단계의 상태 (R-07.21: 전체 진행 상황). 학습 화면 왼쪽 안내 패널용 */
export function TutorialStepList() {
  const { state, definition } = useTutorial();
  const done = state.status === 'idle' ? [] : state.completedStepIds;
  const skipped = state.status === 'idle' ? [] : state.skippedStepIds;
  return (
    <ol
      className="flex flex-col gap-1 text-sm"
      aria-label="튜토리얼 단계"
      data-testid="tutorial-step-list"
    >
      {definition.steps.map((candidate, index) => {
        const current = state.status === 'active' && state.stepIndex === index;
        const status = done.includes(candidate.id)
          ? '완료'
          : skipped.includes(candidate.id)
            ? '건너뜀'
            : current
              ? '진행 중'
              : '대기';
        return (
          <li
            key={candidate.id}
            aria-current={current ? 'step' : undefined}
            className={current ? 'font-semibold text-brand' : 'text-fg-secondary'}
          >
            {index + 1}. {candidate.title} <span className="text-xs text-fg-muted">({status})</span>
          </li>
        );
      })}
    </ol>
  );
}

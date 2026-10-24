import { useCallback, useMemo } from 'react';

import {
  detectTutorialAction,
  guardMessage,
  shouldForwardToRunner,
} from '@/engine/tutorials/actionDetector';
import type { GridUserAction } from '@/engine/tutorials/actionDetector';

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
 * 현재 단계의 결과 안내와 '다음' 버튼. '다음'은 행동이 맞은 confirm 단계에서만 눌린다.
 * 행동을 하기 전에는 눌러도 아무 일도 없도록 비활성이며, 러너도 같은 조건에서만 NEXT를 받아들인다.
 */
export function TutorialStepGuards() {
  const { state, step, dispatch } = useTutorial();
  if (state.status !== 'active' || step === null) return null;

  const waitingForNext = state.actionDone && step.next.mode === 'confirm';
  return (
    <div className="flex flex-col gap-2" data-testid="tutorial-step-guards">
      <p className="text-sm font-semibold" data-testid="tutorial-step-title">
        {step.title}
      </p>
      <p className="text-sm text-fg-secondary">{step.description}</p>
      {state.lastFailure !== null && (
        <p role="alert" className="text-sm text-error" data-testid="tutorial-failure">
          {state.lastFailure.message}
        </p>
      )}
      {waitingForNext && (
        <p role="status" className="text-sm text-success">
          {step.successMessage}
        </p>
      )}
      {step.next.mode === 'confirm' && (
        <button
          type="button"
          disabled={!waitingForNext}
          onClick={() => dispatch({ type: 'NEXT' })}
          className="self-start rounded-md border border-line px-3 py-1 text-sm hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          다음
        </button>
      )}
    </div>
  );
}

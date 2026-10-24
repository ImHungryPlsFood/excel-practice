import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

import {
  currentStep,
  INITIAL_TUTORIAL_STATE,
  tutorialReducer,
} from '@/engine/tutorials/tutorialRunner';
import type { TutorialEvent, TutorialState } from '@/engine/tutorials/tutorialRunner';
import type { TutorialDefinition } from '@/types/tutorial.schema';

import { TutorialContext } from './useTutorial';
import type { TutorialContextValue } from './useTutorial';

interface TutorialProviderProps {
  /** TutorialDefinitionSchema.parse 를 통과한 정의 */
  definition: TutorialDefinition;
  children: ReactNode;
}

/** 튜토리얼 러너(tutorialRunner)를 React 상태로 감싼다. 이벤트 감지는 CARD-03B가 dispatch 로 알린다. */
export function TutorialProvider({ definition, children }: TutorialProviderProps) {
  const [state, dispatch] = useReducer(
    (current: TutorialState, event: TutorialEvent) => tutorialReducer(definition, current, event),
    INITIAL_TUTORIAL_STATE,
  );

  const value = useMemo<TutorialContextValue>(
    () => ({
      definition,
      state,
      step: currentStep(definition, state),
      progress: {
        index: state.status === 'active' ? state.stepIndex : null,
        total: definition.steps.length,
        completed: state.status === 'idle' ? 0 : state.completedStepIds.length,
      },
      dispatch,
    }),
    [definition, state],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

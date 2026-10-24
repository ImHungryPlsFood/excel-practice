import { createContext, useContext } from 'react';

import type { TutorialEvent, TutorialState } from '@/engine/tutorials/tutorialRunner';
import type { TutorialDefinition, TutorialStep } from '@/types/tutorial.schema';

export interface TutorialContextValue {
  definition: TutorialDefinition;
  state: TutorialState;
  /** 활성 상태가 아니면 null */
  step: TutorialStep | null;
  /** 진행 상황 (R-07.21): index는 0부터, 활성이 아니면 null */
  progress: { index: number | null; total: number; completed: number };
  dispatch: (event: TutorialEvent) => void;
}

export const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial(): TutorialContextValue {
  const value = useContext(TutorialContext);
  if (value === null) {
    throw new Error('useTutorial은 TutorialProvider 안에서만 쓸 수 있습니다.');
  }
  return value;
}

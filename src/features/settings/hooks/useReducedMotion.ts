import { useCallback, useState } from 'react';

import { useMotionPreference } from '@/components/tutorial/hooks/useMotionPreference';

import { readMotionSetting, saveMotionSetting } from '../motionSetting';
import type { MotionSetting } from '../motionSetting';

/*
 * 모션 감소 설정 화면용 훅 (CARD-03D). 설정값을 읽고 바꾸고(저장 포함),
 * 운영체제 설정과 합친 "지금 실제로 줄어 있는지"를 돌려준다. 읽기 전용 감시는 useMotionPreference가 한다.
 */
export function useReducedMotion(): {
  setting: MotionSetting;
  setSetting: (next: MotionSetting) => void;
  reduced: boolean;
  /** 운영체제 설정만으로 줄어 있는지 */
  systemReduced: boolean;
} {
  const [setting, setLocal] = useState<MotionSetting>(readMotionSetting);
  const { reduced } = useMotionPreference();
  const setSetting = useCallback((next: MotionSetting) => {
    saveMotionSetting(next);
    setLocal(next);
  }, []);
  const systemReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { setting, setSetting, reduced, systemReduced };
}

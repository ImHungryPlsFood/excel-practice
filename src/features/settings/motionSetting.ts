/*
 * 앱 내 모션 감소 설정 (CARD-03D, MASTER_PROMPT §7.3 "모션을 줄이는 설정을 제공하라").
 * 'system'은 운영체제의 prefers-reduced-motion을 따르고, 'reduce'는 OS와 상관없이 항상 줄인다.
 * 적용은 <html data-motion="reduce"> 속성이다. tokens.css가 이 속성에서 시간 토큰을 0으로 만들고,
 * useMotionPreference가 같은 속성을 읽는다. 저장은 localStorage이며 막혀 있으면 이 탭 안에서만 유지된다.
 */

export type MotionSetting = 'system' | 'reduce';

export const MOTION_STORAGE_KEY = 'cellcraft.motion';

let memorySetting: MotionSetting = 'system';

export function readMotionSetting(): MotionSetting {
  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (stored === 'reduce' || stored === 'system') return stored;
  } catch {
    // 저장소가 막혀 있으면(시크릿 창·차단) 이 탭의 값을 쓴다.
    return memorySetting;
  }
  return memorySetting;
}

export function applyMotionSetting(setting: MotionSetting): void {
  if (setting === 'reduce') document.documentElement.dataset.motion = 'reduce';
  else delete document.documentElement.dataset.motion;
}

export function saveMotionSetting(setting: MotionSetting): void {
  memorySetting = setting;
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, setting);
  } catch {
    // 저장하지 못해도 이번 탭에서는 적용된다.
  }
  applyMotionSetting(setting);
}

/** 앱이 처음 그려지기 전에 저장된 설정을 적용해 첫 화면에 애니메이션이 한 번 보이는 일을 막는다. */
export function applyStoredMotionSetting(): void {
  applyMotionSetting(readMotionSetting());
}

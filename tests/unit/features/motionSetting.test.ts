import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyStoredMotionSetting,
  MOTION_STORAGE_KEY,
  readMotionSetting,
  saveMotionSetting,
} from '@/features/settings/motionSetting';

describe('모션 감소 설정 저장 (CARD-03D)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.motion;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    saveMotionSetting('system');
  });

  it('기본은 시스템 설정 따르기이고 속성이 없다', () => {
    expect(readMotionSetting()).toBe('system');
    applyStoredMotionSetting();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it("'항상 줄이기'를 저장하면 localStorage에 남고 <html data-motion>이 켜진다", () => {
    saveMotionSetting('reduce');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe('reduce');
    expect(document.documentElement.dataset.motion).toBe('reduce');
    // 새로 열었을 때(저장값만 있는 상태)에도 적용된다
    delete document.documentElement.dataset.motion;
    applyStoredMotionSetting();
    expect(document.documentElement.dataset.motion).toBe('reduce');
  });

  it('시스템 설정 따르기로 되돌리면 속성이 사라진다', () => {
    saveMotionSetting('reduce');
    saveMotionSetting('system');
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it('알 수 없는 저장값은 무시한다', () => {
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'bounce');
    expect(readMotionSetting()).toBe('system');
  });

  it('저장소가 막혀 있어도 던지지 않고 이 탭에서는 적용된다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveMotionSetting('reduce')).not.toThrow();
    expect(document.documentElement.dataset.motion).toBe('reduce');
    expect(readMotionSetting()).toBe('reduce');
  });
});

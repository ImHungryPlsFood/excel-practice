import { useReducedMotion } from '@/features/settings/hooks/useReducedMotion';
import type { MotionSetting } from '@/features/settings/motionSetting';

const OPTIONS: ReadonlyArray<{ value: MotionSetting; label: string; hint: string }> = [
  {
    value: 'system',
    label: '시스템 설정 따르기',
    hint: '운영체제의 "동작 줄이기" 설정을 그대로 따릅니다.',
  },
  {
    value: 'reduce',
    label: '항상 줄이기',
    hint: '화면 전환·말풍선 이동 같은 움직임을 끕니다. 내용과 기능은 그대로입니다.',
  },
];

/** 설정 화면 (CARD-03D). 지금은 모션 감소 하나다. */
export function SettingsPage() {
  const { setting, setSetting, reduced, systemReduced } = useReducedMotion();
  return (
    <section aria-labelledby="settings-title" className="max-w-2xl">
      <h1 id="settings-title" className="text-2xl font-semibold text-fg">
        설정
      </h1>
      <fieldset className="mt-6 flex flex-col gap-3">
        <legend className="text-lg font-semibold text-fg">움직임 줄이기</legend>
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3"
          >
            <input
              type="radio"
              name="motion"
              value={option.value}
              checked={setting === option.value}
              onChange={() => setSetting(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-fg">{option.label}</span>
              <span className="block text-sm text-fg-secondary">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p role="status" className="mt-4 text-sm text-fg-secondary" data-testid="motion-status">
        {reduced
          ? setting === 'system' && systemReduced
            ? '지금 움직임이 줄어 있습니다 (시스템 설정).'
            : '지금 움직임이 줄어 있습니다.'
          : '지금 움직임이 기본으로 켜져 있습니다.'}
      </p>
    </section>
  );
}

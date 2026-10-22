export interface LogoProps {
  className?: string;
}

/**
 * CELLCRAFT 독자 로고 (R-01.05, R-04.01).
 * 3×3 셀 격자 가운데 선택된 셀 하나를 강조한 형태로, 기존 서비스의 로고·캐릭터를 참고하지 않았다.
 */
export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="CELLCRAFT 로고"
      className={['size-8 shrink-0', className].filter(Boolean).join(' ')}
    >
      <rect width="32" height="32" rx="7" className="fill-brand" />
      <path
        d="M6 13.33h20M6 18.67h20M13.33 6v20M18.67 6v20"
        strokeWidth="1.25"
        className="stroke-on-brand opacity-40"
      />
      <rect
        x="13.33"
        y="13.33"
        width="5.34"
        height="5.34"
        strokeWidth="2"
        className="fill-none stroke-on-brand"
      />
      <rect x="17.27" y="17.27" width="2.8" height="2.8" className="fill-on-brand" />
    </svg>
  );
}

import type { HTMLAttributes } from 'react';

/*
 * 나타날 때 짧게 올라오며 페이드하는 묶음 (CARD-03D, R-07.29 다음 문제, R-07.30 결과 화면, R-07.23 단계 시작).
 * 움직임은 motion.css의 .cc-enter(transform·opacity, --motion-* 토큰)가 전부이며, 모션 감소에서는 즉시 끝난다.
 * 새로 보여 줄 때마다 애니메이션을 다시 하려면 호출하는 쪽에서 key를 바꿔 다시 마운트한다.
 */
export function MotionWrapper({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['cc-enter', className ?? ''].join(' ').trim()} {...rest}>
      {children}
    </div>
  );
}

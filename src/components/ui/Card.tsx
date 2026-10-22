import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'article' | 'li';
}

/** 학습 UI용 카드. 스프레드시트 셀에는 사용하지 않는다 (MASTER_PROMPT §12.2). */
export function Card({ as: Component = 'div', className, ...rest }: CardProps) {
  return (
    <Component
      className={['rounded-lg border border-line bg-surface p-6 shadow-sm', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}

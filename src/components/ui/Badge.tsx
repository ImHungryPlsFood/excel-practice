import type { HTMLAttributes } from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'border-line bg-subtle text-fg-secondary',
  brand: 'border-brand-subtle bg-brand-subtle text-brand',
  success: 'border-success-bg bg-success-bg text-success',
  warning: 'border-warning-bg bg-warning-bg text-warning',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        TONE_CLASS[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}

import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

// 색상 전환만 사용한다. 레이아웃 속성 전환 금지 (UX_MOTION_PERF P-03).
const BASE_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap ' +
  'transition-colors duration-(--motion-duration-fast) ease-out ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-subtle',
  ghost: 'text-fg-secondary hover:bg-subtle hover:text-fg',
};

// 높이는 컨트롤 높이 토큰을 따른다 (sm 32px = 고밀도 컨트롤, RESEARCH_NOTES 관점 9).
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-(--cc-control-height-sm) px-3 text-sm',
  md: 'h-(--cc-control-height-md) px-4 text-sm',
  lg: 'h-(--cc-control-height-lg) px-6 text-base',
};

export function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
): string {
  return [BASE_CLASS, VARIANT_CLASS[variant], SIZE_CLASS[size], className]
    .filter(Boolean)
    .join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, size, className)} {...rest} />;
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** 페이지 이동에는 버튼이 아니라 링크를 써야 하므로, 버튼 모양의 <a>를 별도로 제공한다. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonLinkProps) {
  return <a className={buttonClassName(variant, size, className)} {...rest} />;
}

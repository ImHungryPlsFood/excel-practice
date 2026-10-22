import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Button, ButtonLink, ButtonRouterLink } from '@/components/ui/Button';

describe('Button', () => {
  it('renders an accessible button with its label', () => {
    render(<Button>저장</Button>);

    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>확인</Button>);

    expect(screen.getByRole('button', { name: '확인' })).toHaveAttribute('type', 'button');
  });

  it('keeps an explicit type', () => {
    render(<Button type="submit">제출</Button>);

    expect(screen.getByRole('button', { name: '제출' })).toHaveAttribute('type', 'submit');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>실행</Button>);

    fireEvent.click(screen.getByRole('button', { name: '실행' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        실행
      </Button>,
    );

    const button = screen.getByRole('button', { name: '실행' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies primary/md styles by default', () => {
    render(<Button>기본</Button>);

    const button = screen.getByRole('button', { name: '기본' });
    expect(button).toHaveClass('bg-brand', 'text-on-brand', 'h-(--cc-control-height-md)');
  });

  it('applies the requested variant and size', () => {
    render(
      <Button variant="secondary" size="sm">
        보조
      </Button>,
    );

    const button = screen.getByRole('button', { name: '보조' });
    expect(button).toHaveClass('border-line-strong', 'bg-surface', 'h-(--cc-control-height-sm)');
    expect(button).not.toHaveClass('bg-brand');
  });

  it('appends a custom className without dropping base styles', () => {
    render(<Button className="w-full">넓게</Button>);

    expect(screen.getByRole('button', { name: '넓게' })).toHaveClass('w-full', 'inline-flex');
  });

  it('shows a visible focus outline style', () => {
    render(<Button>포커스</Button>);

    expect(screen.getByRole('button', { name: '포커스' })).toHaveClass(
      'focus-visible:outline-2',
      'focus-visible:outline-focus',
    );
  });
});

describe('ButtonLink', () => {
  it('renders a link with button styling and the given href', () => {
    render(
      <ButtonLink href="/dashboard" size="lg">
        학습 시작
      </ButtonLink>,
    );

    const link = screen.getByRole('link', { name: '학습 시작' });
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(link).toHaveClass('bg-brand', 'h-(--cc-control-height-lg)');
  });
});

describe('ButtonRouterLink', () => {
  it('renders an in-app link with button styling', () => {
    render(
      <MemoryRouter>
        <ButtonRouterLink to="/dashboard" size="lg">
          대시보드
        </ButtonRouterLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: '대시보드' });
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(link).toHaveClass('bg-brand', 'h-(--cc-control-height-lg)');
  });
});

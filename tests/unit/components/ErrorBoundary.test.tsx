import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error('폭발');
  }
  return <p>정상 화면</p>;
}

function Harness({ onError }: { onError?: () => void }) {
  const [explode, setExplode] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setExplode(false)}>
        원인 해결
      </button>
      <ErrorBoundary onError={onError}>
        <Bomb explode={explode} />
      </ErrorBoundary>
    </>
  );
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('오류가 없으면 자식을 그대로 렌더링한다', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('정상 화면')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('자식의 렌더링 오류를 잡아 오류 화면과 onError 호출로 격리한다', () => {
    // React가 잡힌 오류를 console.error로 출력하므로, 테스트 로그를 어지럽히지 않도록 호출 여부만 확인한다.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onError = vi.fn();

    render(<Harness onError={onError} />);

    expect(screen.getByRole('alert')).toHaveTextContent('문제가 발생했습니다');
    expect(screen.getByRole('alert')).toHaveTextContent('폭발');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
  });

  it('원인이 해결된 뒤 다시 시도하면 정상 화면으로 복구한다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: '원인 해결' }));
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(screen.getByText('정상 화면')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('원인이 그대로면 다시 시도해도 오류 화면이 유지된다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

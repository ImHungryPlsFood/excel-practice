import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** 오류가 잡혔을 때 호출된다. 로깅·모니터링 연결용. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 렌더링 오류를 격리해 앱 전체가 흰 화면이 되는 것을 막는다 (Q-09).
 * 저장 실패 재시도·오프라인 캐시는 저장소가 생기는 CARD-06B에서 구현한다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error === null) {
      return this.props.children;
    }
    return (
      <div role="alert" className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold text-fg">문제가 발생했습니다</h1>
        <p className="text-fg-secondary">
          화면을 표시하는 중 오류가 발생했습니다. 다시 시도해도 해결되지 않으면 페이지를 새로고침해
          주세요.
        </p>
        <p className="text-sm text-fg-muted">{this.state.error.message}</p>
        <Button onClick={this.reset}>다시 시도</Button>
      </div>
    );
  }
}

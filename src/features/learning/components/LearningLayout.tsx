import type { ReactNode } from 'react';

/*
 * 실제 학습 화면 레이아웃 (CARD-02C, MASTER_PROMPT §4.4, PRODUCT_SPEC 2.4).
 * 강의 페이지가 아니라 스프레드시트 작업 공간을 중심에 둔다(R-04.38).
 *
 * - 상단(48px): 현재 단원, 진행 단계, 나가기 (R-04.39)
 * - 왼쪽(280px): 학습 설명과 단계별 안내 (R-04.40)
 * - 중앙(남는 폭 전부): 실제 조작 가능한 스프레드시트 (R-04.41)
 * - 오른쪽(320px): 문제 조건, 목표, 선택적 힌트 (R-04.42)
 * - 하단(40px): 작업 상태와 실행 취소·다시 시작·진행 버튼 (R-04.43)
 *
 * 내용을 넘기지 않은 영역은 그리지 않는다. 빈 패널로 작업 공간을 줄이지 않는다(R-04.44).
 * 넓은 화면(lg 이상)에서는 좌우 패널을 옆에 두고, 좁은 화면에서는 작업 공간을 맨 위에 두고 패널을 그 아래에 쌓는다.
 */

interface LearningLayoutProps {
  /** 상단: 단원 이름, 진행 단계, 나가기 */
  header?: ReactNode;
  /** 왼쪽: 학습 설명과 단계별 안내 */
  guide?: ReactNode;
  /** 오른쪽: 문제 조건, 목표, 힌트 */
  task?: ReactNode;
  /** 하단: 작업 상태와 조작 버튼 */
  footer?: ReactNode;
  /** 중앙: 스프레드시트 작업 공간 */
  children: ReactNode;
}

export function LearningLayout({ header, guide, task, footer, children }: LearningLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-canvas text-fg">
      {header !== undefined && (
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
          {header}
        </header>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <main
          aria-label="작업 공간"
          className="order-1 flex min-h-[60vh] min-w-0 flex-1 flex-col lg:order-2 lg:min-h-0"
        >
          {children}
        </main>
        {guide !== undefined && (
          <aside
            aria-label="학습 안내"
            className="order-2 shrink-0 border-t border-line bg-surface p-4 lg:order-1 lg:w-[280px] lg:overflow-y-auto lg:border-t-0 lg:border-r"
          >
            {guide}
          </aside>
        )}
        {task !== undefined && (
          <aside
            aria-label="문제와 힌트"
            className="order-3 shrink-0 border-t border-line bg-surface p-4 lg:w-[320px] lg:overflow-y-auto lg:border-t-0 lg:border-l"
          >
            {task}
          </aside>
        )}
      </div>
      {footer !== undefined && (
        <footer className="flex h-10 shrink-0 items-center gap-3 border-t border-line bg-surface px-4 text-sm">
          {footer}
        </footer>
      )}
    </div>
  );
}

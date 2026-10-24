import { useEffect, useRef, type ReactNode } from 'react';

/*
 * 모달 대화상자 공통 틀 (CARD-04C). 열리면 안으로 포커스를 옮기고 Tab을 안에 가두며,
 * Esc나 바깥 클릭으로 닫으면 열기 전 포커스 위치로 돌려 준다.
 */
interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ title, onClose, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel)?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--cc-overlay-dim) p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-5 text-sm text-fg shadow-lg"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
            return;
          }
          if (event.key !== 'Tab') return;
          const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
          const first = items[0];
          const last = items[items.length - 1];
          if (first === undefined || last === undefined) return;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

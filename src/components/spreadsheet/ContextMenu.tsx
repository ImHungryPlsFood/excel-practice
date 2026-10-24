import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

/*
 * 그리드 오른쪽 클릭 메뉴와 크기 입력 상자 (CARD-02E, R-08.06·R-08.07).
 * 마우스 오른쪽 클릭, Shift+F10, 메뉴 키로 연다. 위·아래 화살표로 고르고 Enter로 실행, Esc로 닫는다.
 * 닫히면 그리드로 포커스를 돌려준다(onClose).
 */

export interface MenuItem {
  label: string;
  /** 오른쪽에 보여 줄 단축키 안내 */
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  label: string;
  items: readonly (MenuItem | 'separator')[];
  onClose: () => void;
}

export function ContextMenu({ x, y, label, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const enabled = items.filter((item): item is MenuItem => item !== 'separator' && !item.disabled);
  const [focused, setFocused] = useState(0);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>('[data-menu-index="0"]')?.focus();
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [onClose]);

  const focusItem = (index: number) => {
    const next = (index + enabled.length) % enabled.length;
    setFocused(next);
    menuRef.current?.querySelector<HTMLElement>(`[data-menu-index="${next}"]`)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(focused + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(focused - 1);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      onClose();
    }
  };

  // 고를 수 있는 항목의 순번(화살표 이동용). 구분선·사용 불가 항목은 건너뛴다.
  const enabledIndexes = items.map((item) =>
    item === 'separator' || item.disabled ? undefined : enabled.indexOf(item),
  );
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed z-50 min-w-48 rounded-md border border-line bg-surface py-1 text-sm shadow-lg"
      style={{ top: y, left: x }}
    >
      {items.map((item, index) => {
        if (item === 'separator') {
          return (
            <div key={`sep-${index}`} role="separator" className="my-1 border-t border-line" />
          );
        }
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            data-menu-index={enabledIndexes[index]}
            tabIndex={-1}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className="flex w-full items-center justify-between gap-6 px-3 py-1 text-left text-fg hover:bg-subtle focus:bg-subtle focus:outline-none disabled:text-fg-muted"
          >
            <span>{item.label}</span>
            {item.shortcut !== undefined && (
              <span className="text-xs text-fg-muted">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface SizePromptProps {
  x: number;
  y: number;
  /** "열 너비" 또는 "행 높이" */
  title: string;
  initial: number;
  min: number;
  max: number;
  onSubmit: (size: number | null) => void;
  onClose: () => void;
}

/** 열 너비·행 높이를 픽셀로 입력하는 작은 상자. 확인하면 onSubmit, '기본 크기'는 null. */
export function SizePrompt({ x, y, title, initial, min, max, onSubmit, onClose }: SizePromptProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(String(initial));
  const value = Number(draft);
  const valid = Number.isInteger(value) && value >= min && value <= max;

  const submit = () => {
    if (!valid) return;
    onClose();
    onSubmit(value);
  };

  return (
    <div
      role="dialog"
      aria-label={title}
      className="fixed z-50 flex flex-col gap-2 rounded-md border border-line bg-surface p-3 text-sm shadow-lg"
      style={{ top: y, left: x }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <label htmlFor={inputId} className="text-fg">
        {title} (픽셀, {min}~{max})
      </label>
      <input
        id={inputId}
        type="number"
        autoFocus
        min={min}
        max={max}
        value={draft}
        aria-invalid={valid ? undefined : true}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
        className="w-28 rounded-sm border border-line px-2 py-1 text-fg"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!valid}
          onClick={submit}
          className="rounded-md border border-selected px-2 py-0.5 text-selected hover:bg-subtle disabled:opacity-50"
        >
          확인
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onSubmit(null);
          }}
          className="rounded-md border border-line px-2 py-0.5 hover:bg-subtle"
        >
          기본 크기
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-2 py-0.5 hover:bg-subtle"
        >
          취소
        </button>
      </div>
    </div>
  );
}

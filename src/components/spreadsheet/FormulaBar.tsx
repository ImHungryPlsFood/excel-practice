import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

import { KEEP_EDITING_ATTRIBUTE, movesFocusWithinEditors } from './editorFocus';
import { parseCellReference, toggleReferenceAt } from './formulaReference';
import type { CellEditingController } from './hooks/useCellEditing';
import { useImeInput } from './hooks/useImeInput';
import type { CellPosition } from './types';

/*
 * 수식 입력줄 (CARD-02C, R-08.11): 이름 상자 + fx 버튼 + 수식 입력 상자 + 안내 줄.
 *
 * 셀 위 편집기와 같은 편집 컨트롤러(useCellEditing)를 쓴다. 여기서 치면 셀에도 같은 초안이 보이고,
 * 셀에서 치면 여기에도 보인다. 확정은 컨트롤러의 commit() 하나를 거치므로 어느 쪽에서 입력해도 결과가 같다.
 * 한글 조합 중 Enter·Tab·Esc·F4는 IME 몫이라 확정·이동으로 해석하지 않는다(useImeInput, Q-05).
 */

interface FormulaBarProps {
  /** 활성 셀 */
  activeCell: CellPosition;
  /** 활성 셀 주소(A1 형식) */
  address: string;
  /** 편집 중이 아닐 때 보여 줄 활성 셀 원문 */
  value: string;
  editor: CellEditingController;
  rowCount: number;
  colCount: number;
  /** 안내 줄 문장(오류 안내, 입력 거부 사유). 없으면 안내 줄을 비운다. */
  message: string | null;
  /** 이름 상자에서 주소로 이동 */
  onNavigate: (row: number, col: number) => void;
  /** Enter/Tab으로 확정한 뒤 활성 셀을 옮긴다. */
  onFinish: (dRow: number, dCol: number) => void;
  /** Esc 등으로 그리드에 포커스를 돌려준다. */
  onReturnFocus: () => void;
}

function columnIndex(letters: string): number {
  return [...letters.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

export const FormulaBar = forwardRef<HTMLDivElement, FormulaBarProps>(function FormulaBar(
  {
    activeCell,
    address,
    value,
    editor,
    rowCount,
    colCount,
    message,
    onNavigate,
    onFinish,
    onReturnFocus,
  },
  ref,
) {
  const { editing } = editor;
  const messageId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const { handleCompositionStart, handleCompositionEnd, isImeKeyEvent } = useImeInput();

  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    if (caret !== null && inputRef.current !== null) {
      inputRef.current.setSelectionRange(caret, caret);
      pendingCaretRef.current = null;
    }
  }, [editing?.draft]);

  const shown = editing?.draft ?? value;

  const startEditing = (draft: string) =>
    editor.begin({ row: activeCell.row, col: activeCell.col, draft, mode: 'edit' });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (editing === null) {
      startEditing(event.target.value);
    } else {
      editor.update(event.target.value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isImeKeyEvent(event)) return;
    const { key, shiftKey } = event;
    if (key === 'Enter' || key === 'Tab') {
      event.preventDefault();
      // 거부되면(수식 길이 상한 등) 편집을 유지하고 안내 줄에 이유를 보여 준다.
      if (!editor.commit()) return;
      if (key === 'Enter') onFinish(shiftKey ? -1 : 1, 0);
      else onFinish(0, shiftKey ? -1 : 1);
    } else if (key === 'Escape') {
      event.preventDefault();
      editor.cancel();
      onReturnFocus();
    } else if (key === 'F4') {
      // 브라우저 기본 동작을 막고, 수식이면 커서 위치 참조의 $ 고정을 바꾼다 (Q-06).
      event.preventDefault();
      if (shown.startsWith('=')) {
        const toggled = toggleReferenceAt(
          shown,
          event.currentTarget.selectionStart ?? shown.length,
        );
        if (!toggled.changed) return;
        pendingCaretRef.current = toggled.caret;
        if (editing === null) startEditing(toggled.text);
        else editor.update(toggled.text);
      }
    } else if (key === 'F1') {
      event.preventDefault();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    // 셀 편집기·fx 버튼으로 옮겨 가면 같은 편집이 이어진다.
    if (movesFocusWithinEditors(event.relatedTarget)) return;
    editor.commit();
  };

  const startFromButton = () => {
    if (editing === null) startEditing(value === '' ? '=' : value);
    inputRef.current?.focus();
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const parts = parseCellReference((nameDraft ?? address).trim());
      setNameDraft(null);
      if (parts !== null) {
        const row = parts.row - 1;
        const col = columnIndex(parts.column);
        if (row < rowCount && col < colCount) {
          onNavigate(row, col);
          return;
        }
      }
      onReturnFocus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setNameDraft(null);
      onReturnFocus();
    }
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label="수식 입력 도구"
      className="border-b border-line bg-surface"
    >
      <div className="flex h-9 items-stretch">
        <input
          aria-label="이름 상자"
          className="w-24 shrink-0 border-r border-line bg-surface px-2 text-sm text-fg focus:outline-2 focus:-outline-offset-2 focus:outline-focus"
          value={nameDraft ?? address}
          spellCheck={false}
          autoComplete="off"
          onFocus={(event) => {
            setNameDraft(address);
            event.currentTarget.select();
          }}
          onChange={(event) => setNameDraft(event.target.value)}
          onKeyDown={handleNameKeyDown}
          onBlur={() => setNameDraft(null)}
        />
        <button
          type="button"
          aria-label="수식 입력 시작"
          title="수식 입력 시작"
          {...{ [KEEP_EDITING_ATTRIBUTE]: '' }}
          onClick={startFromButton}
          className="w-10 shrink-0 border-r border-line text-sm font-semibold text-fg-secondary italic hover:bg-subtle focus:outline-2 focus:-outline-offset-2 focus:outline-focus"
        >
          fx
        </button>
        <input
          ref={inputRef}
          aria-label={`수식 입력줄 ${address}`}
          aria-describedby={messageId}
          data-editing={editing === null ? 'false' : 'true'}
          {...{ [KEEP_EDITING_ATTRIBUTE]: '' }}
          className="min-w-0 flex-1 bg-surface px-2 font-mono text-sm text-fg focus:outline-2 focus:-outline-offset-2 focus:outline-editing"
          value={shown}
          spellCheck={false}
          autoComplete="off"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onBlur={handleBlur}
        />
      </div>
      <p
        id={messageId}
        role="status"
        aria-live="polite"
        className={[
          'min-h-6 border-t border-line px-2 text-xs leading-6',
          message === null ? 'text-fg-muted' : 'bg-error-bg text-error',
        ].join(' ')}
      >
        {message ?? ''}
      </p>
    </div>
  );
});

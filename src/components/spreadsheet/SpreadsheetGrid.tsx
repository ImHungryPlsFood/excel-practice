import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import { CellEditor } from './CellEditor';
import { movesFocusWithinEditors } from './editorFocus';
import { toggleReferenceAt } from './formulaReference';
import { GridCell } from './GridCell';
import { ColumnHeader, RowHeaderCell } from './GridHeader';
import { cellAddress, isInRange, useCellSelection } from './hooks/useCellSelection';
import { useCellEditing, type EditingState } from './hooks/useCellEditing';
import { useImeInput } from './hooks/useImeInput';
import { GRID_METRICS, useVirtualGrid } from './hooks/useVirtualGrid';
import type {
  CellChange,
  CellPosition,
  SpreadsheetGridHandle,
  SpreadsheetGridProps,
} from './types';

/*
 * 가상화 스프레드시트 그리드 (CARD-02A, ADR-002).
 *
 * 키보드 입력은 활성 셀 위에 겹친 CellEditor(<input>) 하나가 항상 받는다. 첫 글자가 들어오거나
 * IME 조합이 시작되면 편집 모드가 된다.
 *
 * 편집 상태는 useCellEditing 컨트롤러가 가진다(CARD-02C). editor prop으로 받으면 수식 입력줄과 같은
 * 컨트롤러를 공유하고, 없으면 그리드가 직접 만든다. 초안은 Enter/Tab/화살표/포커스 이탈 때 확정된다
 * (UX_MOTION_PERF P-05 1계층). 포커스가 수식 입력줄로 옮겨 갈 때는 같은 편집이 이어지므로 확정하지 않는다.
 */

const ARROW_DELTAS: Partial<Record<string, CellPosition>> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
};

function positionFromTarget(target: EventTarget | null): CellPosition | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest<HTMLElement>('[data-row][data-col]');
  if (cell === null) return null;
  return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
}

export const SpreadsheetGrid = forwardRef<SpreadsheetGridHandle, SpreadsheetGridProps>(
  function SpreadsheetGrid(
    {
      rowCount,
      colCount,
      getCellValue,
      getCellDisplay,
      onCellsChange,
      onActiveCellChange,
      editor: sharedEditor,
      onUndo,
      onRedo,
      label,
      className,
    },
    ref,
  ) {
    const idPrefix = useId();
    const cellId = (row: number, col: number) => `${idPrefix}-r${row}-c${col}`;

    const { selection, range, dispatch } = useCellSelection({ rowCount, colCount });
    const { active } = selection;
    const virtual = useVirtualGrid(rowCount, colCount);
    const { scrollToCell } = virtual;

    const ownEditor = useCellEditing({
      getCellValue,
      applyChanges: (changes) => {
        onCellsChange(changes);
        return null;
      },
    });
    const editor = sharedEditor ?? ownEditor;
    const { editing } = editor;
    const inputRef = useRef<HTMLInputElement>(null);
    const draggingRef = useRef(false);
    // F4로 참조를 바꾼 뒤 다시 그려진 입력 상자에 커서를 놓을 위치
    const pendingCaretRef = useRef<number | null>(null);

    const beginEditing = useCallback(
      (mode: EditingState['mode'], draft: string) => {
        editor.begin({ row: active.row, col: active.col, draft, mode });
        inputRef.current?.focus();
      },
      [active.row, active.col, editor],
    );

    const { handleCompositionStart, handleCompositionEnd, isImeKeyEvent } = useImeInput({
      onCompositionStart: () => {
        if (editing === null) beginEditing('enter', '');
      },
    });

    /** 편집 중인 초안을 확정한다. 거부되어(수식 길이 상한 등) 편집이 계속되면 false. */
    const commitEditing = useCallback(() => editor.commit(), [editor]);

    const cancelEditing = () => editor.cancel();

    const clearRange = () => {
      const changes: CellChange[] = [];
      for (let row = range.startRow; row <= range.endRow; row += 1) {
        for (let col = range.startCol; col <= range.endCol; col += 1) {
          if (getCellValue(row, col) !== '') changes.push({ row, col, value: '' });
        }
      }
      if (changes.length > 0) onCellsChange(changes);
    };

    useLayoutEffect(() => {
      scrollToCell(active.row, active.col);
    }, [active.row, active.col, scrollToCell]);

    // 활성 셀이 바뀌면 바깥(수식 입력줄·이름 상자)에 알린다. 콜백 참조가 바뀌어도 다시 알리지 않도록 ref로 둔다.
    const activeListenerRef = useRef(onActiveCellChange);
    useLayoutEffect(() => {
      activeListenerRef.current = onActiveCellChange;
    });
    useEffect(() => {
      activeListenerRef.current?.({ row: active.row, col: active.col });
    }, [active.row, active.col]);

    useLayoutEffect(() => {
      const caret = pendingCaretRef.current;
      if (caret !== null && inputRef.current !== null) {
        inputRef.current.setSelectionRange(caret, caret);
        pendingCaretRef.current = null;
      }
    }, [editing?.draft]);

    useEffect(() => {
      const stopDragging = () => {
        draggingRef.current = false;
      };
      window.addEventListener('mouseup', stopDragging);
      return () => window.removeEventListener('mouseup', stopDragging);
    }, []);

    // 핸들은 한 번 만든 객체를 계속 쓴다. Spotlight처럼 핸들을 오래 들고 있는 쪽도 항상 최신 상태로 동작하도록
    // 메서드는 매 렌더 갱신되는 latestRef를 통해 현재 선택·편집 상태에 접근한다.
    const latestRef = useRef({
      scrollToCell,
      getCellViewportRect: virtual.getCellViewportRect,
      getRangeViewportRect: virtual.getRangeViewportRect,
      commitEditing,
      beginEditing,
      getCellValue,
      active,
    });
    useLayoutEffect(() => {
      latestRef.current = {
        scrollToCell,
        getCellViewportRect: virtual.getCellViewportRect,
        getRangeViewportRect: virtual.getRangeViewportRect,
        commitEditing,
        beginEditing,
        getCellValue,
        active,
      };
    });

    useImperativeHandle(
      ref,
      () => ({
        scrollToCell: (row, col) => latestRef.current.scrollToCell(row, col),
        getCellViewportRect: (row, col) => latestRef.current.getCellViewportRect(row, col),
        getRangeViewportRect: (startRow, startCol, endRow, endCol) =>
          latestRef.current.getRangeViewportRect(startRow, startCol, endRow, endCol),
        selectCell: (row, col) => {
          latestRef.current.commitEditing();
          dispatch({ type: 'select', position: { row, col } });
          inputRef.current?.focus();
        },
        startEditing: (initialChar) => {
          const latest = latestRef.current;
          if (initialChar === undefined) {
            latest.beginEditing('edit', latest.getCellValue(latest.active.row, latest.active.col));
          } else {
            latest.beginEditing('enter', initialChar);
          }
        },
        focus: () => inputRef.current?.focus(),
      }),
      [dispatch],
    );

    const move = (dRow: number, dCol: number, extend = false) =>
      dispatch({ type: 'move', dRow, dCol, extend });

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      // 조합 중 키는 IME 몫이다. Enter로 글자를 확정하는 순간 셀까지 확정하면 글자가 유실·중복된다.
      if (isImeKeyEvent(event)) return;

      const { key, shiftKey } = event;
      const ctrl = event.ctrlKey || event.metaKey;

      // F1은 브라우저 도움말을 열므로 그리드 안에서는 막는다 (TEST_STRATEGY Q-06).
      if (key === 'F1') {
        event.preventDefault();
        return;
      }
      // F4는 수식 편집 중 참조 고정($)을 바꾼다(Excel). 그 밖에는 브라우저 기본 동작만 막는다 (Q-06).
      if (key === 'F4') {
        event.preventDefault();
        if (editing !== null && editing.draft.startsWith('=')) {
          const caret = event.currentTarget.selectionStart ?? editing.draft.length;
          const toggled = toggleReferenceAt(editing.draft, caret);
          if (toggled.changed) {
            pendingCaretRef.current = toggled.caret;
            editor.update(toggled.text);
          }
        }
        return;
      }

      // 실행 취소·다시 실행 (CARD-02D, Q-06). 편집 중에는 입력 상자의 글자 단위 되돌리기를 그대로 둔다.
      if (editing === null && ctrl && !event.altKey) {
        const letter = key.toLowerCase();
        if (letter === 'z' && !shiftKey) {
          event.preventDefault();
          onUndo?.();
          return;
        }
        if (letter === 'y' || (letter === 'z' && shiftKey)) {
          event.preventDefault();
          onRedo?.();
          return;
        }
      }

      if (editing !== null) {
        const arrow = ARROW_DELTAS[key];
        if (key === 'Enter') {
          event.preventDefault();
          if (commitEditing()) move(shiftKey ? -1 : 1, 0);
        } else if (key === 'Tab') {
          event.preventDefault();
          if (commitEditing()) move(0, shiftKey ? -1 : 1);
        } else if (key === 'Escape') {
          event.preventDefault();
          cancelEditing();
        } else if (arrow !== undefined && editing.mode === 'enter') {
          event.preventDefault();
          if (commitEditing()) move(arrow.row, arrow.col);
        }
        return;
      }

      const arrow = ARROW_DELTAS[key];
      if (arrow !== undefined && !ctrl) {
        event.preventDefault();
        move(arrow.row, arrow.col, shiftKey);
        return;
      }

      switch (key) {
        case 'Enter':
          event.preventDefault();
          move(shiftKey ? -1 : 1, 0);
          return;
        case 'Tab':
          event.preventDefault();
          move(0, shiftKey ? -1 : 1);
          return;
        case 'F2':
          event.preventDefault();
          beginEditing('edit', getCellValue(active.row, active.col));
          return;
        case 'Delete':
          event.preventDefault();
          clearRange();
          return;
        case 'Backspace':
          // Excel처럼 활성 셀을 비운 채 편집을 시작한다. Esc로 취소하면 원래 값이 남는다.
          event.preventDefault();
          beginEditing('enter', '');
          return;
        case 'Home':
          event.preventDefault();
          dispatch({
            type: 'select',
            position: ctrl ? { row: 0, col: 0 } : { row: active.row, col: 0 },
          });
          return;
        case 'PageDown':
        case 'PageUp': {
          event.preventDefault();
          const page = virtual.getPageRowCount();
          move(key === 'PageDown' ? page : -page, 0, shiftKey);
          return;
        }
        default:
          if (ctrl && key.toLowerCase() === 'a') {
            event.preventDefault();
            dispatch({ type: 'selectAll' });
          }
      }
    };

    /** 편집 중이 아니면 입력된 첫 글자로 편집을 시작한다. */
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const draft = event.target.value;
      if (editing === null) {
        beginEditing('enter', draft);
      } else {
        editor.update(draft);
      }
    };

    /** 수식 입력줄로 포커스가 옮겨 가면 같은 편집이 이어지므로 확정하지 않는다. */
    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      if (movesFocusWithinEditors(event.relatedTarget)) return;
      commitEditing();
    };

    const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
      const position = positionFromTarget(event.target);
      if (position === null || event.button !== 0) return;
      // 포커스를 입력 상자에 그대로 두기 위해 기본 동작(포커스 이동·텍스트 선택)을 막는다.
      event.preventDefault();
      // 확정이 거부되면(수식 길이 상한 등) 편집 중인 셀에 머문다.
      if (!commitEditing()) return;
      dispatch(event.shiftKey ? { type: 'extendTo', position } : { type: 'select', position });
      draggingRef.current = true;
      inputRef.current?.focus();
    };

    const handleMouseOver = (event: MouseEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const position = positionFromTarget(event.target);
      if (position !== null) dispatch({ type: 'extendTo', position });
    };

    const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
      const position = positionFromTarget(event.target);
      if (position === null) return;
      editor.begin({ ...position, draft: getCellValue(position.row, position.col), mode: 'edit' });
      inputRef.current?.focus();
    };

    const isEditing = editing !== null;
    const activeAddress = cellAddress(active);

    return (
      <div
        ref={virtual.scrollRef}
        role="grid"
        aria-label={label}
        aria-rowcount={rowCount + 1}
        aria-colcount={colCount + 1}
        aria-multiselectable="true"
        className={['relative overflow-auto bg-grid', className ?? ''].join(' ')}
        onMouseDown={handleMouseDown}
        onMouseOver={handleMouseOver}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="relative"
          style={{ width: virtual.totalWidth, height: virtual.totalHeight }}
        >
          <ColumnHeader colItems={virtual.colItems} totalWidth={virtual.totalWidth} range={range} />

          {virtual.rowItems.map((rowItem) => {
            const row = rowItem.index;
            return (
              <div
                key={rowItem.key}
                role="row"
                aria-rowindex={row + 2}
                className="absolute left-0 flex"
                style={{ top: rowItem.start, height: rowItem.size, width: virtual.totalWidth }}
              >
                <RowHeaderCell
                  row={row}
                  highlighted={row >= range.startRow && row <= range.endRow}
                />
                {virtual.colItems.map((colItem) => {
                  const col = colItem.index;
                  const display = getCellDisplay?.(row, col);
                  return (
                    <GridCell
                      key={colItem.key}
                      id={cellId(row, col)}
                      row={row}
                      col={col}
                      left={colItem.start}
                      width={colItem.size}
                      value={display?.text ?? getCellValue(row, col)}
                      kind={display?.kind ?? 'text'}
                      inRange={isInRange(range, row, col)}
                      isActive={row === active.row && col === active.col}
                    />
                  );
                })}
              </div>
            );
          })}

          <CellEditor
            ref={inputRef}
            label={`${label} ${activeAddress} 셀${isEditing ? ' 편집 중' : ''}`}
            activeDescendant={cellId(active.row, active.col)}
            isEditing={isEditing}
            value={editing?.draft ?? ''}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onBlur={handleBlur}
            top={GRID_METRICS.colHeaderHeight + active.row * GRID_METRICS.rowHeight}
            left={GRID_METRICS.rowHeaderWidth + active.col * GRID_METRICS.colWidth}
            width={GRID_METRICS.colWidth}
            height={GRID_METRICS.rowHeight}
          />
        </div>
      </div>
    );
  },
);

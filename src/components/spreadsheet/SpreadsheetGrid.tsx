import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import { GridCell } from './GridCell';
import { ColumnHeader, RowHeaderCell } from './GridHeader';
import { cellAddress, isInRange, useCellSelection } from './hooks/useCellSelection';
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
 * 키보드 입력은 활성 셀 위에 겹친 <input> 하나가 항상 받는다. 편집 중이 아닐 때는 투명하게 두는데,
 * 이렇게 해야 셀을 고른 뒤 바로 한글을 쳐도 IME 조합이 정상으로 시작된다(div에 포커스를 두면
 * 첫 자모가 조합되지 않거나 따로 떨어진다). 첫 글자가 들어오거나 조합이 시작되면 편집 모드가 된다.
 *
 * 편집 모드 두 가지 (Excel 방식):
 * - enter: 셀에 바로 타이핑해 시작. 화살표를 누르면 확정하고 이동한다.
 * - edit: F2·더블클릭으로 시작. 화살표는 글자 사이 커서를 움직인다.
 *
 * 편집 초안은 이 컴포넌트의 state에만 있고 Enter/Tab/화살표/포커스 이탈 때 onCellsChange로 확정된다
 * (UX_MOTION_PERF P-05 1계층).
 */

interface EditingState {
  row: number;
  col: number;
  draft: string;
  mode: 'enter' | 'edit';
}

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
    { rowCount, colCount, getCellValue, onCellsChange, label, className },
    ref,
  ) {
    const idPrefix = useId();
    const cellId = (row: number, col: number) => `${idPrefix}-r${row}-c${col}`;

    const { selection, range, dispatch } = useCellSelection({ rowCount, colCount });
    const { active } = selection;
    const virtual = useVirtualGrid(rowCount, colCount);
    const { scrollToCell } = virtual;

    const [editing, setEditing] = useState<EditingState | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const draggingRef = useRef(false);

    const beginEditing = useCallback(
      (mode: EditingState['mode'], draft: string) => {
        setEditing({ row: active.row, col: active.col, draft, mode });
        inputRef.current?.focus();
      },
      [active.row, active.col],
    );

    const { handleCompositionStart, handleCompositionEnd, isImeKeyEvent } = useImeInput({
      onCompositionStart: () => {
        if (editing === null) beginEditing('enter', '');
      },
    });

    /** 편집 중인 초안을 확정한다. 내용이 바뀌었을 때만 변경을 알린다. */
    const commitEditing = useCallback(() => {
      if (editing === null) return;
      if (editing.draft !== getCellValue(editing.row, editing.col)) {
        onCellsChange([{ row: editing.row, col: editing.col, value: editing.draft }]);
      }
      setEditing(null);
    }, [editing, getCellValue, onCellsChange]);

    const cancelEditing = () => setEditing(null);

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

      if (editing !== null) {
        const arrow = ARROW_DELTAS[key];
        if (key === 'Enter') {
          event.preventDefault();
          commitEditing();
          move(shiftKey ? -1 : 1, 0);
        } else if (key === 'Tab') {
          event.preventDefault();
          commitEditing();
          move(0, shiftKey ? -1 : 1);
        } else if (key === 'Escape') {
          event.preventDefault();
          cancelEditing();
        } else if (arrow !== undefined && editing.mode === 'enter') {
          event.preventDefault();
          commitEditing();
          move(arrow.row, arrow.col);
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
        setEditing({ ...editing, draft });
      }
    };

    const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
      const position = positionFromTarget(event.target);
      if (position === null || event.button !== 0) return;
      // 포커스를 입력 상자에 그대로 두기 위해 기본 동작(포커스 이동·텍스트 선택)을 막는다.
      event.preventDefault();
      commitEditing();
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
      setEditing({ ...position, draft: getCellValue(position.row, position.col), mode: 'edit' });
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
                  return (
                    <GridCell
                      key={colItem.key}
                      id={cellId(row, col)}
                      row={row}
                      col={col}
                      left={colItem.start}
                      width={colItem.size}
                      value={getCellValue(row, col)}
                      inRange={isInRange(range, row, col)}
                      isActive={row === active.row && col === active.col}
                    />
                  );
                })}
              </div>
            );
          })}

          <input
            ref={inputRef}
            aria-label={`${label} ${activeAddress} 셀${isEditing ? ' 편집 중' : ''}`}
            aria-activedescendant={cellId(active.row, active.col)}
            data-editing={isEditing ? 'true' : 'false'}
            autoComplete="off"
            spellCheck={false}
            value={editing?.draft ?? ''}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onBlur={commitEditing}
            className={[
              'absolute z-[5] m-0 border-0 px-1 text-sm leading-6 outline-2 -outline-offset-2',
              // 편집 중이 아닐 때는 마우스 이벤트를 아래 셀로 통과시켜 활성 셀에서도 더블클릭·드래그가 된다.
              isEditing
                ? 'bg-cell text-fg outline-editing'
                : 'pointer-events-none bg-transparent text-transparent caret-transparent outline-selected',
            ].join(' ')}
            style={{
              top: GRID_METRICS.colHeaderHeight + active.row * GRID_METRICS.rowHeight,
              left: GRID_METRICS.rowHeaderWidth + active.col * GRID_METRICS.colWidth,
              width: GRID_METRICS.colWidth,
              height: GRID_METRICS.rowHeight,
            }}
          />
        </div>
      </div>
    );
  },
);

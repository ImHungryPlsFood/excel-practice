import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';

import {
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_ROW_HEIGHT,
  SIZE_LIMITS,
  clampSize,
} from '@/engine/spreadsheet/operations/rowColumnOps';

import { CellEditor } from './CellEditor';
import { ContextMenu, SizePrompt, type MenuItem } from './ContextMenu';
import { movesFocusWithinEditors } from './editorFocus';
import { toggleReferenceAt } from './formulaReference';
import { GridCell } from './GridCell';
import { ColumnHeader, RowHeaderCell } from './GridHeader';
import { GridOverlays } from './GridOverlays';
import {
  cellAddress,
  isInRange,
  isWholeColumns,
  isWholeRows,
  useCellSelection,
} from './hooks/useCellSelection';
import { useCellEditing, type EditingState } from './hooks/useCellEditing';
import { useFillHandle } from './hooks/useFillHandle';
import { useImeInput } from './hooks/useImeInput';
import { GRID_METRICS, useVirtualGrid } from './hooks/useVirtualGrid';
import type {
  CellChange,
  CellPosition,
  CellRange,
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
 *
 * CARD-02E:
 * - 행·열 머리글 클릭·끌기로 전체 선택, 경계 끌기로 크기 조절, 오른쪽 클릭·Shift+F10 메뉴로 삽입·삭제·크기(R-08.06)
 * - Ctrl+C/X/V는 입력 상자의 copy/cut/paste 이벤트로 처리한다(편집 중이면 입력 상자 글자 복사 그대로, R-08.07)
 * - 채우기 핸들 끌기, Ctrl+D·Ctrl+R(R-08.10)
 * - 수식 편집 중 셀 클릭·끌기·enter 모드 화살표로 참조 넣기(포인트 모드, R-08.02). 그 밖의 클릭은 지금처럼 확정·선택
 * - Ctrl+PageUp/PageDown, Ctrl+Shift+PageUp/PageDown 시트 이동(Q-06: Chromium은 Ctrl+PageUp/PageDown을 탭 전환에
 *   쓰고 페이지에 넘기지 않으므로 Ctrl+Shift 조합이 대체 단축키다)
 */

const ARROW_DELTAS: Partial<Record<string, CellPosition>> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
};

const EMPTY_RANGES: readonly CellRange[] = [];

function closestData(target: EventTarget | null, attribute: string): number | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>(`[${attribute}]`);
  if (element === null) return null;
  const value = element.getAttribute(attribute);
  return value === null ? null : Number(value);
}

function positionFromTarget(target: EventTarget | null): CellPosition | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest<HTMLElement>('[data-row][data-col]');
  if (cell === null) return null;
  return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
}

interface Resizing {
  axis: 'row' | 'col';
  index: number;
  /** 누른 곳의 화면 좌표 */
  origin: number;
  startSize: number;
  size: number;
}

interface MenuState {
  x: number;
  y: number;
}

interface SizePromptState {
  x: number;
  y: number;
  axis: 'row' | 'col';
  indexes: number[];
  initial: number;
}

const countLabel = (count: number) => (count === 1 ? '' : ` ${count}개`);

export const SpreadsheetGrid = forwardRef<SpreadsheetGridHandle, SpreadsheetGridProps>(
  function SpreadsheetGrid(
    {
      rowCount,
      colCount,
      getCellValue,
      getCellDisplay,
      onCellsChange,
      onActiveCellChange,
      onSelectionChange,
      editor: sharedEditor,
      onUndo,
      onRedo,
      layout,
      structure,
      clipboard,
      onFill,
      onFillFromEdge,
      pointMode,
      referenceRanges = EMPTY_RANGES,
      editingElsewhere = false,
      onSheetNavigate,
      label,
      className,
    },
    ref,
  ) {
    const idPrefix = useId();
    const cellId = (row: number, col: number) => `${idPrefix}-r${row}-c${col}`;
    const bounds = { rowCount, colCount };

    const { selection, range, dispatch } = useCellSelection(bounds);
    const { active } = selection;
    const virtual = useVirtualGrid(rowCount, colCount, layout);
    const { scrollToCell } = virtual;
    // 겹침 표시(GridOverlays, memo)가 스크롤 프레임마다 다시 그려지지 않도록 위치 함수 묶음을 고정한다.
    const overlayGeometry = useMemo(
      () => ({ rowTop: virtual.rowTop, colLeft: virtual.colLeft }),
      [virtual.rowTop, virtual.colLeft],
    );

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
    // 머리글을 누른 채 끌어 여러 행·열을 고르는 중: 처음 누른 행·열
    const headerDragRef = useRef<{ axis: 'row' | 'col'; from: number } | null>(null);
    // F4로 참조를 바꾼 뒤 다시 그려진 입력 상자에 커서를 놓을 위치
    const pendingCaretRef = useRef<number | null>(null);
    const [resizing, setResizing] = useState<Resizing | null>(null);
    const [menu, setMenu] = useState<MenuState | null>(null);
    const [sizePrompt, setSizePrompt] = useState<SizePromptState | null>(null);
    const fill = useFillHandle({ onFill });

    const beginEditing = useCallback(
      (mode: EditingState['mode'], draft: string) => {
        editor.begin({ row: active.row, col: active.col, draft, mode });
        inputRef.current?.focus();
      },
      [active.row, active.col, editor],
    );

    const ime = useImeInput({
      onCompositionStart: () => {
        if (editing === null) beginEditing('enter', '');
      },
    });
    const { isImeKeyEvent, resetComposition } = ime;
    // 편집이 끝나면 조합 표시를 끈다(조합 중 클릭으로 확정되면 compositionend가 오지 않는다).
    useEffect(() => {
      if (editing === null) resetComposition();
    }, [editing, resetComposition]);
    const handleCompositionStart = () => {
      editor.setComposing(true);
      ime.handleCompositionStart();
    };
    const handleCompositionEnd = () => {
      editor.setComposing(false);
      ime.handleCompositionEnd();
    };

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

    // 선택 범위가 바뀌면 알린다(처음 그려질 때는 제외: 사용자가 고른 것이 아니다).
    const selectionListenerRef = useRef(onSelectionChange);
    useLayoutEffect(() => {
      selectionListenerRef.current = onSelectionChange;
    });
    // 같은 범위를 두 번 알리지 않는다(개발 모드 StrictMode의 효과 이중 실행 포함).
    const lastRangeRef = useRef<string | null>(null);
    const { startRow, startCol, endRow, endCol } = range;
    useEffect(() => {
      const key = `${startRow},${startCol},${endRow},${endCol}`;
      const previous = lastRangeRef.current;
      lastRangeRef.current = key;
      if (previous === null || previous === key) return;
      selectionListenerRef.current?.({ startRow, startCol, endRow, endCol });
    }, [startRow, startCol, endRow, endCol]);

    useLayoutEffect(() => {
      const input = inputRef.current;
      if (input === null) return;
      const caret = pendingCaretRef.current;
      if (caret !== null) {
        input.setSelectionRange(caret, caret);
        pendingCaretRef.current = null;
      } else if (editing?.caret !== undefined && document.activeElement === input) {
        // 포인트 모드로 참조를 넣은 뒤 커서를 참조 끝에 둔다.
        input.setSelectionRange(editing.caret, editing.caret);
      }
    }, [editing?.draft, editing?.caret]);

    useEffect(() => {
      const stopDragging = () => {
        draggingRef.current = false;
        headerDragRef.current = null;
        pointMode?.pointerUp();
      };
      window.addEventListener('mouseup', stopDragging);
      return () => window.removeEventListener('mouseup', stopDragging);
    }, [pointMode]);

    // 머리글 경계를 끄는 동안 창 전체에서 마우스를 따라간다. 놓을 때의 선택 범위·동작은 매 렌더 갱신되는 ref에서 읽는다.
    const resizingRef = useRef<Resizing | null>(null);
    // 아래 latestRef와 같은 레이아웃 효과에서 갱신한다(커밋마다 도는 효과를 늘리지 않는다).
    const resizeContextRef = useRef({ range, rowCount, colCount, structure });
    const resizeAxis = resizing?.axis;
    useEffect(() => {
      if (resizeAxis === undefined) return;
      const move = (event: globalThis.MouseEvent) => {
        const current = resizingRef.current;
        if (current === null) return;
        const position = current.axis === 'col' ? event.clientX : event.clientY;
        const next = {
          ...current,
          size: clampSize(current.startSize + position - current.origin, current.axis),
        };
        resizingRef.current = next;
        setResizing(next);
      };
      const finish = () => {
        const current = resizingRef.current;
        resizingRef.current = null;
        setResizing(null);
        if (current === null || current.size === current.startSize) return;
        const context = resizeContextRef.current;
        const sheetBounds = { rowCount: context.rowCount, colCount: context.colCount };
        const selected = context.range;
        const whole =
          current.axis === 'col'
            ? isWholeColumns(selected, sheetBounds)
            : isWholeRows(selected, sheetBounds);
        const [start, end] =
          current.axis === 'col'
            ? [selected.startCol, selected.endCol]
            : [selected.startRow, selected.endRow];
        // 전체 선택한 여러 열(행) 중 하나를 끌면 모두 같은 크기가 된다(Excel).
        const indexes =
          whole && current.index >= start && current.index <= end
            ? Array.from({ length: end - start + 1 }, (_, k) => start + k)
            : [current.index];
        context.structure?.resize(current.axis, indexes, current.size);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', finish);
      return () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', finish);
      };
    }, [resizeAxis]);

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
      resizeContextRef.current = { range, rowCount, colCount, structure };
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

    const openMenuAt = (x: number, y: number) => {
      if (structure === undefined && clipboard === undefined) return;
      setSizePrompt(null);
      setMenu({ x, y });
    };

    const closeMenu = useCallback(() => {
      setMenu(null);
      inputRef.current?.focus();
    }, []);

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

      // 시트 이동 (CARD-02E, Q-06). Ctrl+PageUp/PageDown은 Chromium이 탭 전환으로 먼저 가져가 페이지에 오지 않을 수 있다.
      if (ctrl && !event.altKey && (key === 'PageDown' || key === 'PageUp')) {
        if (onSheetNavigate !== undefined) {
          event.preventDefault();
          if (editing === null || commitEditing()) onSheetNavigate(key === 'PageDown' ? 1 : -1);
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
        // 아래로·오른쪽으로 채우기 (CARD-02E). Chromium에서 Ctrl+D(북마크)·Ctrl+R(새로고침)은 페이지가 막을 수 있다.
        if ((letter === 'd' || letter === 'r') && !shiftKey && onFillFromEdge !== undefined) {
          event.preventDefault();
          onFillFromEdge(range, letter === 'd' ? 'down' : 'right');
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
          // 수식에서 참조를 넣을 자리면 화살표가 참조를 움직인다(포인트 모드).
          if (pointMode?.arrow(arrow.row, arrow.col, shiftKey)) return;
          if (commitEditing()) move(arrow.row, arrow.col);
        }
        return;
      }

      if ((key === 'F10' && shiftKey) || key === 'ContextMenu') {
        event.preventDefault();
        const rect = virtual.getCellViewportRect(active.row, active.col);
        if (rect !== null) openMenuAt(rect.left + rect.width / 2, rect.top + rect.height);
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
        case 'Escape':
          // 복사 범위 점선을 지운다(Excel).
          if (clipboard?.clear()) event.preventDefault();
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
      if (editingElsewhere) return;
      const draft = event.target.value;
      editor.setCaret(event.target.selectionStart ?? draft.length);
      if (editing === null) {
        beginEditing('enter', draft);
      } else {
        editor.update(draft);
      }
    };

    const handleSelect = (event: SyntheticEvent<HTMLInputElement>) => {
      if (editing === null || editingElsewhere) return;
      const input = event.currentTarget;
      editor.setCaret(input.selectionStart ?? input.value.length);
    };

    /** 수식 입력줄로 포커스가 옮겨 가면 같은 편집이 이어지므로 확정하지 않는다. */
    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      if (movesFocusWithinEditors(event.relatedTarget)) return;
      if (editingElsewhere) return;
      commitEditing();
    };

    // ---- 복사·잘라내기·붙여넣기 (편집 중이면 입력 상자 기본 동작) ----

    const handleCopy = (cut: boolean) => (event: ClipboardEvent<HTMLInputElement>) => {
      if (editing !== null || clipboard === undefined) return;
      event.preventDefault();
      clipboard.copy(range, cut, event.clipboardData);
    };

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
      if (editing !== null || clipboard === undefined) return;
      event.preventDefault();
      const pasted = clipboard.paste(range, event.clipboardData.getData('text/plain'));
      if (pasted !== null) dispatch({ type: 'selectRange', range: pasted });
    };

    // ---- 마우스 ----

    const startHeaderSelection = (axis: 'row' | 'col', index: number, extend: boolean) => {
      const anchorIndex = axis === 'col' ? active.col : active.row;
      const from = extend ? anchorIndex : index;
      headerDragRef.current = { axis, from };
      dispatch(
        axis === 'col'
          ? { type: 'selectColumns', from, to: index }
          : { type: 'selectRows', from, to: index },
      );
    };

    const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      const resizeCol = closestData(event.target, 'data-resize-col');
      const resizeRow = closestData(event.target, 'data-resize-row');
      if ((resizeCol !== null || resizeRow !== null) && structure !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        if (!commitEditing()) return;
        const axis = resizeCol !== null ? 'col' : 'row';
        const index = resizeCol ?? resizeRow ?? 0;
        const startSize = axis === 'col' ? virtual.colSize(index) : virtual.rowSize(index);
        const next: Resizing = {
          axis,
          index,
          origin: axis === 'col' ? event.clientX : event.clientY,
          startSize,
          size: startSize,
        };
        resizingRef.current = next;
        setResizing(next);
        return;
      }

      if (event.target instanceof Element && event.target.closest('[data-fill-handle]') !== null) {
        event.preventDefault();
        if (!commitEditing()) return;
        fill.begin(range);
        return;
      }

      const headerCol = closestData(event.target, 'data-header-col');
      const headerRow = closestData(event.target, 'data-header-row');
      if (headerCol !== null || headerRow !== null) {
        event.preventDefault();
        if (!commitEditing()) return;
        startHeaderSelection(
          headerCol !== null ? 'col' : 'row',
          headerCol ?? headerRow ?? 0,
          event.shiftKey,
        );
        inputRef.current?.focus();
        return;
      }

      const position = positionFromTarget(event.target);
      if (position === null) return;
      // 포커스를 입력 상자에 그대로 두기 위해 기본 동작(포커스 이동·텍스트 선택)을 막는다.
      event.preventDefault();
      // 수식 편집 중 참조를 넣을 자리면 셀 참조를 넣는다(포커스는 지금 입력 상자에 그대로).
      if (editing !== null && pointMode?.pointerDown(position, event.shiftKey)) return;
      // 확정이 거부되면(수식 길이 상한 등) 편집 중인 셀에 머문다.
      if (!commitEditing()) return;
      dispatch(event.shiftKey ? { type: 'extendTo', position } : { type: 'select', position });
      draggingRef.current = true;
      inputRef.current?.focus();
    };

    const handleMouseOver = (event: MouseEvent<HTMLDivElement>) => {
      // 휠 스크롤 중에는 커서 아래 셀이 바뀔 때마다 mouseover가 온다. 끄는 중이 아니면 DOM을 찾지 않고 바로 끝낸다.
      const pointing = pointMode?.dragging === true;
      if (
        !pointing &&
        !draggingRef.current &&
        headerDragRef.current === null &&
        !fill.isFilling()
      ) {
        return;
      }
      const position = positionFromTarget(event.target);
      if (pointing) {
        if (position !== null) pointMode?.pointerMove(position);
        return;
      }
      if (fill.isFilling()) {
        if (position !== null) fill.hover(position);
        return;
      }
      const header = headerDragRef.current;
      if (header !== null) {
        const index =
          header.axis === 'col'
            ? (closestData(event.target, 'data-header-col') ?? position?.col ?? null)
            : (closestData(event.target, 'data-header-row') ?? position?.row ?? null);
        if (index !== null) {
          dispatch(
            header.axis === 'col'
              ? { type: 'selectColumns', from: header.from, to: index }
              : { type: 'selectRows', from: header.from, to: index },
          );
        }
        return;
      }
      if (!draggingRef.current) return;
      if (position !== null) dispatch({ type: 'extendTo', position });
    };

    const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
      const position = positionFromTarget(event.target);
      if (position === null) return;
      // 수식 편집 중 포인트 모드로 누른 셀이면 편집을 새로 시작하지 않는다.
      if (editing !== null && editing.draft.startsWith('=')) return;
      editor.begin({ ...position, draft: getCellValue(position.row, position.col), mode: 'edit' });
      inputRef.current?.focus();
    };

    const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
      if (structure === undefined && clipboard === undefined) return;
      event.preventDefault();
      if (!commitEditing()) return;
      const headerCol = closestData(event.target, 'data-header-col');
      const headerRow = closestData(event.target, 'data-header-row');
      const position = positionFromTarget(event.target);
      if (
        headerCol !== null &&
        !(headerCol >= range.startCol && headerCol <= range.endCol && isWholeColumns(range, bounds))
      ) {
        dispatch({ type: 'selectColumns', from: headerCol, to: headerCol });
      } else if (
        headerRow !== null &&
        !(headerRow >= range.startRow && headerRow <= range.endRow && isWholeRows(range, bounds))
      ) {
        dispatch({ type: 'selectRows', from: headerRow, to: headerRow });
      } else if (position !== null && !isInRange(range, position.row, position.col)) {
        dispatch({ type: 'select', position });
      }
      openMenuAt(event.clientX, event.clientY);
    };

    // ---- 메뉴 ----

    const rowCountSelected = range.endRow - range.startRow + 1;
    const colCountSelected = range.endCol - range.startCol + 1;

    const openSizePrompt = (axis: 'row' | 'col') => {
      const indexes =
        axis === 'col'
          ? Array.from({ length: colCountSelected }, (_, k) => range.startCol + k)
          : Array.from({ length: rowCountSelected }, (_, k) => range.startRow + k);
      const first = indexes[0] ?? 0;
      setSizePrompt({
        x: menu?.x ?? 0,
        y: menu?.y ?? 0,
        axis,
        indexes,
        initial: axis === 'col' ? virtual.colSize(first) : virtual.rowSize(first),
      });
    };

    const menuItems: (MenuItem | 'separator')[] = [];
    if (clipboard !== undefined) {
      menuItems.push(
        {
          label: '잘라내기',
          shortcut: 'Ctrl+X',
          onSelect: () => clipboard.copy(range, true, null),
        },
        { label: '복사', shortcut: 'Ctrl+C', onSelect: () => clipboard.copy(range, false, null) },
        {
          label: '붙여넣기',
          shortcut: 'Ctrl+V',
          onSelect: () => {
            const pasted = clipboard.paste(range, null);
            if (pasted !== null) dispatch({ type: 'selectRange', range: pasted });
          },
        },
      );
    }
    if (structure !== undefined) {
      if (menuItems.length > 0) menuItems.push('separator');
      menuItems.push(
        {
          label: `위에 행${countLabel(rowCountSelected)} 삽입`,
          onSelect: () => structure.change('row', 'insert', range.startRow, rowCountSelected),
        },
        {
          label: `왼쪽에 열${countLabel(colCountSelected)} 삽입`,
          onSelect: () => structure.change('col', 'insert', range.startCol, colCountSelected),
        },
        {
          label: `행${countLabel(rowCountSelected)} 삭제`,
          onSelect: () => structure.change('row', 'delete', range.startRow, rowCountSelected),
        },
        {
          label: `열${countLabel(colCountSelected)} 삭제`,
          onSelect: () => structure.change('col', 'delete', range.startCol, colCountSelected),
        },
        'separator',
        { label: '행 높이…', onSelect: () => openSizePrompt('row') },
        { label: '열 너비…', onSelect: () => openSizePrompt('col') },
      );
    }

    const isEditing = editing !== null && !editingElsewhere;
    const activeAddress = cellAddress(active);
    const resizeGuide =
      resizing === null
        ? null
        : resizing.axis === 'col'
          ? {
              left:
                GRID_METRICS.rowHeaderWidth + virtual.colLeft(resizing.index) + resizing.size - 1,
              top: 0,
              width: 2,
              height: virtual.totalHeight,
            }
          : {
              top:
                GRID_METRICS.colHeaderHeight + virtual.rowTop(resizing.index) + resizing.size - 1,
              left: 0,
              height: 2,
              width: virtual.totalWidth,
            };

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
        onContextMenu={handleContextMenu}
      >
        <div
          className="relative"
          style={{ width: virtual.totalWidth, height: virtual.totalHeight }}
        >
          <ColumnHeader
            colItems={virtual.colItems}
            totalWidth={virtual.totalWidth}
            range={range}
            resizable={structure !== undefined}
          />

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
                  height={rowItem.size}
                  highlighted={row >= range.startRow && row <= range.endRow}
                  resizable={structure !== undefined}
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

          <GridOverlays
            geometry={overlayGeometry}
            referenceRanges={referenceRanges}
            pointRange={pointMode?.range ?? null}
            marquee={clipboard?.marquee ?? null}
            fillSource={onFill !== undefined && editing === null ? range : null}
            fillPreview={fill.preview}
          />

          {resizeGuide !== null && (
            <div
              aria-hidden="true"
              data-resize-guide=""
              className="pointer-events-none absolute z-30 bg-focus"
              style={resizeGuide}
            />
          )}

          <CellEditor
            ref={inputRef}
            label={`${label} ${activeAddress} 셀${isEditing ? ' 편집 중' : ''}`}
            activeDescendant={cellId(active.row, active.col)}
            isEditing={isEditing}
            value={isEditing ? (editing?.draft ?? '') : ''}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onBlur={handleBlur}
            onSelect={handleSelect}
            onCopy={handleCopy(false)}
            onCut={handleCopy(true)}
            onPaste={handlePaste}
            top={GRID_METRICS.colHeaderHeight + virtual.rowTop(active.row)}
            left={GRID_METRICS.rowHeaderWidth + virtual.colLeft(active.col)}
            width={virtual.colSize(active.col)}
            height={virtual.rowSize(active.row)}
          />
        </div>
        {menu !== null && (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            label={`${activeAddress} 셀 메뉴`}
            items={menuItems}
            onClose={closeMenu}
          />
        )}
        {sizePrompt !== null && (
          <SizePrompt
            x={sizePrompt.x}
            y={sizePrompt.y}
            title={sizePrompt.axis === 'col' ? '열 너비' : '행 높이'}
            initial={sizePrompt.initial}
            min={sizePrompt.axis === 'col' ? SIZE_LIMITS.minColumnWidth : SIZE_LIMITS.minRowHeight}
            max={sizePrompt.axis === 'col' ? SIZE_LIMITS.maxColumnWidth : SIZE_LIMITS.maxRowHeight}
            onSubmit={(size) => {
              const { axis, indexes } = sizePrompt;
              const fallback = axis === 'col' ? DEFAULT_COLUMN_WIDTH : DEFAULT_ROW_HEIGHT;
              structure?.resize(axis, indexes, size === fallback ? null : size);
            }}
            onClose={() => {
              setSizePrompt(null);
              inputRef.current?.focus();
            }}
          />
        )}
      </div>
    );
  },
);

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { CellResult } from '@/engine/spreadsheet/FormulaEngineAdapter';

import { FormulaBar } from './FormulaBar';
import { referencedRanges } from './formulaReference';
import { cellAddress } from './hooks/useCellSelection';
import { useCellEditing } from './hooks/useCellEditing';
import { useClipboard } from './hooks/useClipboard';
import { usePointMode, type PointModeEvent } from './hooks/usePointMode';
import type { Workbook } from './hooks/useWorkbook';
import { SheetTabs } from './SheetTabs';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import type {
  CellChange,
  CellDisplay,
  CellPosition,
  CellValueKind,
  GridStructureActions,
  SpreadsheetGridHandle,
  ViewportRect,
} from './types';

/*
 * 수식 입력줄 + 그리드 묶음 (CARD-02C).
 * 편집 컨트롤러 하나를 만들어 FormulaBar와 SpreadsheetGrid(셀 위 편집기)에 함께 넘긴다.
 * 셀에는 계산 결과(Workbook.getResult)를, 편집기와 입력줄에는 원문(Workbook.getInput)을 보여 준다(MASTER_PROMPT §8.2).
 * CARD-02D: 그리드 아래 시트 탭, Ctrl+Z/Y 실행 취소·다시 실행, 값 종류별 기본 정렬.
 * CARD-02E: 행·열 삽입·삭제·크기, 복사·붙여넣기, 자동 채우기, 시트 순서·이동 단축키, 포인트 모드.
 *   포인트 모드로 다른 시트 탭을 누르면 편집을 확정하지 않고 그 시트를 보여 주며 수식 입력줄에서 편집을 이어 간다.
 *   확정·취소하면 편집을 시작한 시트로 돌아간다.
 */

/** 계산 결과의 값 종류 (R-08.22). 원문이 아니라 결과로 정하므로 '123은 문자(text)다. */
export function cellValueKind(result: CellResult): CellValueKind {
  if (result.error !== null) return 'error';
  switch (typeof result.value) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'text';
    default:
      return 'empty';
  }
}

/** 그리드 핸들에 수식 입력줄 좌표를 더한 것 (ADR-002 §4.3 getFormulaBarRect). */
export interface SpreadsheetHandle extends SpreadsheetGridHandle {
  /** 수식 입력줄(이름 상자~입력 상자 한 줄과 안내 줄)의 화면 좌표. 마운트 전이면 null. */
  getFormulaBarRect: () => ViewportRect | null;
}

interface SpreadsheetProps {
  workbook: Workbook;
  label: string;
  rowCount: number;
  colCount: number;
  onActiveCellChange?: (position: CellPosition) => void;
  /** 포인트 모드 시작·참조 변경·종료 (튜토리얼 CARD-03B가 구독한다) */
  onPointModeChange?: (event: PointModeEvent) => void;
  className?: string;
}

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max - 1);

export const Spreadsheet = forwardRef<SpreadsheetHandle, SpreadsheetProps>(function Spreadsheet(
  { workbook, label, rowCount, colCount, onActiveCellChange, onPointModeChange, className },
  ref,
) {
  const gridRef = useRef<SpreadsheetGridHandle>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const formulaInputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState<CellPosition>({ row: 0, col: 0 });
  // 셀 지우기(Delete)처럼 편집기를 거치지 않는 변경이 거부됐을 때의 안내
  const [notice, setNotice] = useState<string | null>(null);
  // 포인트 모드로 다른 시트를 보는 중이면, 편집이 끝났을 때 돌아갈 시트
  const returnSheetRef = useRef<string | null>(null);

  const editor = useCellEditing({
    getCellValue: workbook.getInput,
    applyChanges: workbook.applyChanges,
    currentSheet: () => workbook.activeSheet,
    getCellValueOf: workbook.getInputOf,
    applyChangesTo: workbook.applyChangesTo,
  });
  const pointMode = usePointMode({
    editor,
    viewedSheet: workbook.activeSheet,
    rowCount,
    colCount,
    onChange: onPointModeChange,
  });
  const clipboard = useClipboard({ workbook, onNotice: setNotice });

  const { editing } = editor;
  const formulaSheet = editing?.sheet ?? workbook.activeSheet;
  const editingElsewhere = editing !== null && formulaSheet !== workbook.activeSheet;

  // 편집이 끝나면(확정·취소) 편집을 시작한 시트로 돌아간다.
  useLayoutEffect(() => {
    const back = returnSheetRef.current;
    if (editing !== null || back === null) return;
    returnSheetRef.current = null;
    if (back !== workbook.activeSheet && workbook.sheets.includes(back)) {
      workbook.setActiveSheet(back);
    }
  }, [editing, workbook]);

  useImperativeHandle(ref, () => {
    const grid = () => {
      if (gridRef.current === null) throw new Error('그리드가 아직 마운트되지 않았습니다.');
      return gridRef.current;
    };
    return {
      scrollToCell: (row, col) => grid().scrollToCell(row, col),
      getCellViewportRect: (row, col) => gridRef.current?.getCellViewportRect(row, col) ?? null,
      getRangeViewportRect: (startRow, startCol, endRow, endCol) =>
        gridRef.current?.getRangeViewportRect(startRow, startCol, endRow, endCol) ?? null,
      selectCell: (row, col) => grid().selectCell(row, col),
      startEditing: (initialChar) => grid().startEditing(initialChar),
      focus: () => grid().focus(),
      getFormulaBarRect: () => {
        const rect = barRef.current?.getBoundingClientRect();
        return rect
          ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
          : null;
      },
    };
  }, []);

  const handleActiveCellChange = useCallback(
    (position: CellPosition) => {
      setActive(position);
      setNotice(null);
      onActiveCellChange?.(position);
    },
    [onActiveCellChange],
  );

  const handleCellsChange = useCallback(
    (changes: readonly CellChange[]) => setNotice(workbook.applyChanges(changes)),
    [workbook],
  );

  const getCellDisplay = useCallback(
    (row: number, col: number): CellDisplay => {
      const result = workbook.getResult(row, col);
      return { text: result.displayValue, kind: cellValueKind(result) };
    },
    [workbook],
  );

  const handleUndo = useCallback(() => {
    setNotice(null);
    workbook.undo();
  }, [workbook]);

  const handleRedo = useCallback(() => {
    setNotice(null);
    workbook.redo();
  }, [workbook]);

  /**
   * 시트 탭을 눌렀을 때. 수식에서 참조를 넣을 자리면(포인트 모드) 편집을 이어 가며 그 시트를 보여 주고 시트 참조를 넣는다.
   * 그 밖에는 편집 중인 내용을 지금 시트에 확정하고 옮겨 간다. 확정이 거부되면 머문다.
   */
  const handleSelectSheet = useCallback(
    (name: string) => {
      if (name === workbook.activeSheet) return;
      const current = editor.getEditing();
      if (current !== null && pointMode.canPoint()) {
        returnSheetRef.current ??= current.sheet ?? workbook.activeSheet;
        workbook.setActiveSheet(name);
        pointMode.pointSheet(name, active);
        return;
      }
      if (!editor.commit()) return;
      setNotice(null);
      workbook.setActiveSheet(name);
    },
    [editor, pointMode, workbook, active],
  );

  /** 시트 탭 작업 뒤 포커스: 편집 중(다른 시트에서 참조 넣는 중)이면 수식 입력줄, 아니면 그리드 */
  const focusAfterTabs = useCallback(() => {
    if (editor.getEditing() !== null) formulaInputRef.current?.focus();
    else gridRef.current?.focus();
  }, [editor]);

  const handleSheetNavigate = useCallback(
    (delta: 1 | -1) => {
      const index = workbook.sheets.indexOf(workbook.activeSheet);
      const next = workbook.sheets[index + delta];
      if (next !== undefined) handleSelectSheet(next);
    },
    [workbook, handleSelectSheet],
  );

  const commitThen = useCallback(
    (run: () => string | null): string | null => {
      if (!editor.commit()) return editor.rejection ?? '편집 중인 셀을 먼저 확정하세요.';
      setNotice(null);
      return run();
    },
    [editor],
  );

  const structure = useMemo<GridStructureActions>(
    () => ({
      change: (axis, kind, index, count) =>
        setNotice(workbook.changeStructure(axis, kind, index, count)),
      resize: (axis, indexes, size) => setNotice(workbook.setSizes(axis, indexes, size)),
    }),
    [workbook],
  );

  const referenceRanges = useMemo(
    () =>
      editing !== null && editing.draft.startsWith('=')
        ? referencedRanges(editing.draft, formulaSheet, workbook.activeSheet)
        : [],
    [editing, formulaSheet, workbook.activeSheet],
  );

  const activeError = workbook.getResult(active.row, active.col).error;
  const message =
    workbook.loadError ??
    editor.rejection ??
    notice ??
    (activeError === null ? null : `${activeError.code} — ${activeError.message}`);

  return (
    <div className={['flex min-h-0 flex-col', className ?? ''].join(' ')}>
      <FormulaBar
        ref={barRef}
        formulaInputRef={formulaInputRef}
        activeCell={active}
        address={cellAddress(active)}
        value={workbook.getInput(active.row, active.col)}
        editor={editor}
        rowCount={rowCount}
        colCount={colCount}
        message={message}
        onNavigate={(row, col) => gridRef.current?.selectCell(row, col)}
        onFinish={(dRow, dCol) =>
          gridRef.current?.selectCell(
            clamp(active.row + dRow, rowCount),
            clamp(active.col + dCol, colCount),
          )
        }
        onReturnFocus={() => gridRef.current?.focus()}
      />
      <SpreadsheetGrid
        ref={gridRef}
        label={label}
        rowCount={rowCount}
        colCount={colCount}
        getCellValue={workbook.getInput}
        getCellDisplay={getCellDisplay}
        onCellsChange={handleCellsChange}
        onActiveCellChange={handleActiveCellChange}
        editor={editor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        layout={workbook.layout}
        structure={structure}
        clipboard={clipboard}
        onFill={(source, direction, count) => setNotice(workbook.fill(source, direction, count))}
        onFillFromEdge={(selection, direction) =>
          setNotice(workbook.fillFromEdge(selection, direction))
        }
        pointMode={pointMode}
        referenceRanges={referenceRanges}
        editingElsewhere={editingElsewhere}
        onSheetNavigate={handleSheetNavigate}
        className="min-h-0 flex-1"
      />
      <SheetTabs
        sheets={workbook.sheets}
        activeSheet={workbook.activeSheet}
        onSelect={handleSelectSheet}
        onAdd={() => commitThen(workbook.addSheet)}
        onRename={(oldName, newName) => commitThen(() => workbook.renameSheet(oldName, newName))}
        onDelete={(name) => commitThen(() => workbook.deleteSheet(name))}
        onMove={(name, toIndex) => commitThen(() => workbook.moveSheet(name, toIndex))}
        hasData={workbook.sheetHasData}
        onDone={focusAfterTabs}
      />
    </div>
  );
});

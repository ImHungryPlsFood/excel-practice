import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';

import { FormulaBar } from './FormulaBar';
import { cellAddress } from './hooks/useCellSelection';
import { useCellEditing } from './hooks/useCellEditing';
import type { Workbook } from './hooks/useWorkbook';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import type {
  CellChange,
  CellDisplay,
  CellPosition,
  SpreadsheetGridHandle,
  ViewportRect,
} from './types';

/*
 * 수식 입력줄 + 그리드 묶음 (CARD-02C).
 * 편집 컨트롤러 하나를 만들어 FormulaBar와 SpreadsheetGrid(셀 위 편집기)에 함께 넘긴다.
 * 셀에는 계산 결과(Workbook.getResult)를, 편집기와 입력줄에는 원문(Workbook.getInput)을 보여 준다(MASTER_PROMPT §8.2).
 */

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
  className?: string;
}

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max - 1);

export const Spreadsheet = forwardRef<SpreadsheetHandle, SpreadsheetProps>(function Spreadsheet(
  { workbook, label, rowCount, colCount, onActiveCellChange, className },
  ref,
) {
  const gridRef = useRef<SpreadsheetGridHandle>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<CellPosition>({ row: 0, col: 0 });
  // 셀 지우기(Delete)처럼 편집기를 거치지 않는 변경이 거부됐을 때의 안내
  const [notice, setNotice] = useState<string | null>(null);

  const editor = useCellEditing({
    getCellValue: workbook.getInput,
    applyChanges: workbook.applyChanges,
  });

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
      return { text: result.displayValue, isError: result.error !== null };
    },
    [workbook],
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
        className="min-h-0 flex-1"
      />
    </div>
  );
});

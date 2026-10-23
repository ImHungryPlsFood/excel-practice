import type { VirtualItem } from '@tanstack/react-virtual';

import { columnLabel } from './hooks/useCellSelection';
import { GRID_METRICS } from './hooks/useVirtualGrid';
import type { CellRange } from './types';

/*
 * 고정 머리글: 열 문자(A, B, …, AA)와 행 번호(1..N).
 * 스크롤 영역 안에서 position: sticky로 고정되며, 셀보다 위에 그려지도록 z-index를 둔다.
 * 열 머리글 행(z-20)이 행 번호(z-10)보다 위, 왼쪽 위 모서리(z-30)가 가장 위다.
 */

const headerCellClass = (highlighted: boolean) =>
  [
    'flex items-center justify-center border-r border-b border-grid-line text-xs font-medium select-none',
    highlighted ? 'bg-selected-bg text-selected' : 'bg-grid-header text-fg-secondary',
  ].join(' ');

interface ColumnHeaderProps {
  colItems: readonly VirtualItem[];
  totalWidth: number;
  range: CellRange;
}

export function ColumnHeader({ colItems, totalWidth, range }: ColumnHeaderProps) {
  return (
    <div
      role="row"
      aria-rowindex={1}
      className="sticky top-0 z-20"
      style={{ width: totalWidth, height: GRID_METRICS.colHeaderHeight }}
    >
      <div
        aria-hidden="true"
        className="sticky left-0 z-30 border-r border-b border-grid-line bg-grid-header"
        style={{ width: GRID_METRICS.rowHeaderWidth, height: GRID_METRICS.colHeaderHeight }}
      />
      {colItems.map((item) => (
        <div
          key={item.key}
          role="columnheader"
          aria-colindex={item.index + 2}
          className={`absolute top-0 ${headerCellClass(
            item.index >= range.startCol && item.index <= range.endCol,
          )}`}
          style={{ left: item.start, width: item.size, height: GRID_METRICS.colHeaderHeight }}
        >
          {columnLabel(item.index)}
        </div>
      ))}
    </div>
  );
}

interface RowHeaderCellProps {
  row: number;
  highlighted: boolean;
}

/** 행 안의 첫 칸. 가로 스크롤해도 왼쪽에 붙어 있다. */
export function RowHeaderCell({ row, highlighted }: RowHeaderCellProps) {
  return (
    <div
      role="rowheader"
      aria-colindex={1}
      className={`sticky left-0 z-10 ${headerCellClass(highlighted)}`}
      style={{ width: GRID_METRICS.rowHeaderWidth, height: GRID_METRICS.rowHeight }}
    >
      {row + 1}
    </div>
  );
}

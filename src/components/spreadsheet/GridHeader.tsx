import type { VirtualItem } from '@tanstack/react-virtual';

import { columnLabel } from './hooks/useCellSelection';
import { GRID_METRICS } from './hooks/useVirtualGrid';
import type { CellRange } from './types';

/*
 * 고정 머리글: 열 문자(A, B, …, AA)와 행 번호(1..N).
 * 스크롤 영역 안에서 position: sticky로 고정되며, 셀보다 위에 그려지도록 z-index를 둔다.
 * 열 머리글 행(z-20)이 행 번호(z-10)보다 위, 왼쪽 위 모서리(z-30)가 가장 위다.
 *
 * CARD-02E (R-08.06): 머리글을 누르면 행·열 전체를 고르고(data-header-col/row), 오른쪽(아래) 경계를 끌면 크기를 바꾼다
 * (data-resize-col/row). 오른쪽 클릭·Shift+F10 메뉴(ContextMenu)에서 삽입·삭제·크기를 고른다.
 * 마우스 처리는 SpreadsheetGrid가 이벤트 위임으로 한다.
 */

const headerCellClass = (highlighted: boolean) =>
  [
    'flex items-center justify-center border-r border-b border-grid-line text-xs font-medium select-none',
    highlighted ? 'bg-selected-bg text-selected' : 'bg-grid-header text-fg-secondary',
  ].join(' ');

const RESIZE_HANDLE = 'absolute z-[1] hover:bg-focus';

interface ColumnHeaderProps {
  colItems: readonly VirtualItem[];
  totalWidth: number;
  range: CellRange;
  /** 크기 조절 손잡이를 보일지 */
  resizable: boolean;
}

export function ColumnHeader({ colItems, totalWidth, range, resizable }: ColumnHeaderProps) {
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
          data-header-col={item.index}
          className={`absolute top-0 cursor-pointer ${headerCellClass(
            item.index >= range.startCol && item.index <= range.endCol,
          )}`}
          style={{ left: item.start, width: item.size, height: GRID_METRICS.colHeaderHeight }}
        >
          {columnLabel(item.index)}
          {resizable && (
            <span
              aria-hidden="true"
              data-resize-col={item.index}
              title="끌어서 열 너비 조절"
              className={`${RESIZE_HANDLE} top-0 -right-1 h-full w-2 cursor-col-resize`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface RowHeaderCellProps {
  row: number;
  height: number;
  highlighted: boolean;
  resizable: boolean;
}

/** 행 안의 첫 칸. 가로 스크롤해도 왼쪽에 붙어 있다. */
export function RowHeaderCell({ row, height, highlighted, resizable }: RowHeaderCellProps) {
  return (
    <div
      role="rowheader"
      aria-colindex={1}
      data-header-row={row}
      className={`sticky left-0 z-10 cursor-pointer ${headerCellClass(highlighted)}`}
      style={{ width: GRID_METRICS.rowHeaderWidth, height }}
    >
      {row + 1}
      {resizable && (
        <span
          aria-hidden="true"
          data-resize-row={row}
          title="끌어서 행 높이 조절"
          className={`${RESIZE_HANDLE} -bottom-1 left-0 h-2 w-full cursor-row-resize`}
        />
      )}
    </div>
  );
}

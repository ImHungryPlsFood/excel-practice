import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useRef } from 'react';

import type { ViewportRect } from '../types';

/*
 * 행·열 2D 가상화와 셀 좌표 계산 (ADR-002 §4.1, §4.3).
 * 행·열 크기가 고정이라 셀 위치는 인덱스만으로 계산된다. 덕분에 DOM에 없는 셀의 화면 좌표도
 * 정확히 구할 수 있고, Spotlight(CARD-03C)는 렌더링 여부와 관계없이 같은 API를 쓴다.
 */

export const GRID_METRICS = {
  /** --cc-grid-row-height(1.5rem)와 같은 값 */
  rowHeight: 24,
  colWidth: 96,
  rowHeaderWidth: 48,
  colHeaderHeight: 24,
} as const;

const OVERSCAN = 4;

export function useVirtualGrid(rowCount: number, colCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const getScrollElement = useCallback(() => scrollRef.current, []);

  // paddingStart로 고정 머리글 자리를 비워 두면 item.start가 곧 콘텐츠 안의 셀 좌표가 된다.
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement,
    estimateSize: () => GRID_METRICS.rowHeight,
    paddingStart: GRID_METRICS.colHeaderHeight,
    overscan: OVERSCAN,
  });
  const colVirtualizer = useVirtualizer({
    count: colCount,
    getScrollElement,
    estimateSize: () => GRID_METRICS.colWidth,
    paddingStart: GRID_METRICS.rowHeaderWidth,
    overscan: OVERSCAN,
    horizontal: true,
  });

  const getRangeViewportRect = useCallback(
    (startRow: number, startCol: number, endRow: number, endCol: number): ViewportRect | null => {
      const element = scrollRef.current;
      const inBounds = (row: number, col: number) =>
        row >= 0 && row < rowCount && col >= 0 && col < colCount;
      if (element === null || !inBounds(startRow, startCol) || !inBounds(endRow, endCol)) {
        return null;
      }
      const top = Math.min(startRow, endRow);
      const left = Math.min(startCol, endCol);
      const bottom = Math.max(startRow, endRow);
      const right = Math.max(startCol, endCol);
      const box = element.getBoundingClientRect();
      return {
        top:
          box.top +
          element.clientTop +
          GRID_METRICS.colHeaderHeight +
          top * GRID_METRICS.rowHeight -
          element.scrollTop,
        left:
          box.left +
          element.clientLeft +
          GRID_METRICS.rowHeaderWidth +
          left * GRID_METRICS.colWidth -
          element.scrollLeft,
        width: (right - left + 1) * GRID_METRICS.colWidth,
        height: (bottom - top + 1) * GRID_METRICS.rowHeight,
      };
    },
    [rowCount, colCount],
  );

  const getCellViewportRect = useCallback(
    (row: number, col: number) => getRangeViewportRect(row, col, row, col),
    [getRangeViewportRect],
  );

  /** 셀이 고정 머리글 뒤로 숨지 않고 완전히 보이도록 최소한만 스크롤한다. 동기적으로 반영된다. */
  const scrollToCell = useCallback(
    (row: number, col: number) => {
      const element = scrollRef.current;
      if (element === null || row < 0 || row >= rowCount || col < 0 || col >= colCount) return;

      const cellTop = row * GRID_METRICS.rowHeight;
      const visibleHeight = element.clientHeight - GRID_METRICS.colHeaderHeight;
      if (cellTop < element.scrollTop) {
        element.scrollTop = cellTop;
      } else if (cellTop + GRID_METRICS.rowHeight > element.scrollTop + visibleHeight) {
        element.scrollTop = cellTop + GRID_METRICS.rowHeight - visibleHeight;
      }

      const cellLeft = col * GRID_METRICS.colWidth;
      const visibleWidth = element.clientWidth - GRID_METRICS.rowHeaderWidth;
      if (cellLeft < element.scrollLeft) {
        element.scrollLeft = cellLeft;
      } else if (cellLeft + GRID_METRICS.colWidth > element.scrollLeft + visibleWidth) {
        element.scrollLeft = cellLeft + GRID_METRICS.colWidth - visibleWidth;
      }
    },
    [rowCount, colCount],
  );

  /** 한 화면에 완전히 보이는 행 수 (PageUp/PageDown 이동 폭) */
  const getPageRowCount = useCallback(() => {
    const element = scrollRef.current;
    if (element === null) return 1;
    return Math.max(
      1,
      Math.floor((element.clientHeight - GRID_METRICS.colHeaderHeight) / GRID_METRICS.rowHeight),
    );
  }, []);

  return {
    scrollRef,
    rowItems: rowVirtualizer.getVirtualItems(),
    colItems: colVirtualizer.getVirtualItems(),
    totalHeight: rowVirtualizer.getTotalSize(),
    totalWidth: colVirtualizer.getTotalSize(),
    getCellViewportRect,
    getRangeViewportRect,
    scrollToCell,
    getPageRowCount,
  };
}

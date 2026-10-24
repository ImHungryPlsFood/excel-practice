import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import type { GridLayout, ViewportRect } from '../types';

/*
 * 행·열 2D 가상화와 셀 좌표 계산 (ADR-002 §4.1, §4.3).
 * CARD-02E: 행 높이·열 너비를 바꿀 수 있다. 크기 목록에서 누적 위치(offsets)를 한 번 계산해 두고
 * 셀 위치는 인덱스로 바로 찾는다. 덕분에 DOM에 없는 셀의 화면 좌표도 정확히 구할 수 있고,
 * Spotlight(CARD-03C)는 렌더링 여부와 관계없이 같은 API를 쓴다.
 */

export const GRID_METRICS = {
  /** --cc-grid-row-height(1.5rem)와 같은 값 */
  rowHeight: 24,
  colWidth: 96,
  rowHeaderWidth: 48,
  colHeaderHeight: 24,
} as const;

const OVERSCAN = 4;

/** offsets[i]는 i번째 칸의 시작 위치(머리글 제외), offsets[count]는 전체 길이 */
function buildOffsets(
  count: number,
  size: (index: number) => number | undefined,
  fallback: number,
): Float64Array {
  const offsets = new Float64Array(count + 1);
  for (let i = 0; i < count; i += 1) offsets[i + 1] = (offsets[i] ?? 0) + (size(i) ?? fallback);
  return offsets;
}

export function useVirtualGrid(rowCount: number, colCount: number, layout?: GridLayout) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const getScrollElement = useCallback(() => scrollRef.current, []);
  const layoutKey = layout?.key ?? '';

  const rowOffsets = useMemo(
    () => buildOffsets(rowCount, (row) => layout?.getRowHeight(row), GRID_METRICS.rowHeight),
    [rowCount, layout],
  );
  const colOffsets = useMemo(
    () => buildOffsets(colCount, (col) => layout?.getColumnWidth(col), GRID_METRICS.colWidth),
    [colCount, layout],
  );

  const rowTop = useCallback((row: number) => rowOffsets[row] ?? 0, [rowOffsets]);
  const colLeft = useCallback((col: number) => colOffsets[col] ?? 0, [colOffsets]);
  const rowSize = useCallback(
    (row: number) => (rowOffsets[row + 1] ?? 0) - (rowOffsets[row] ?? 0),
    [rowOffsets],
  );
  const colSize = useCallback(
    (col: number) => (colOffsets[col + 1] ?? 0) - (colOffsets[col] ?? 0),
    [colOffsets],
  );

  // paddingStart로 고정 머리글 자리를 비워 두면 item.start가 곧 콘텐츠 안의 셀 좌표가 된다.
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement,
    estimateSize: rowSize,
    paddingStart: GRID_METRICS.colHeaderHeight,
    overscan: OVERSCAN,
  });
  const colVirtualizer = useVirtualizer({
    count: colCount,
    getScrollElement,
    estimateSize: colSize,
    paddingStart: GRID_METRICS.rowHeaderWidth,
    overscan: OVERSCAN,
    horizontal: true,
  });

  // 크기 값이 바뀌면(layout.key) 가상화 목록이 위치를 다시 잰다. layout 객체는 렌더마다 새로 올 수 있어 key로 판단한다.
  useLayoutEffect(() => {
    rowVirtualizer.measure();
    colVirtualizer.measure();
  }, [layoutKey, rowVirtualizer, colVirtualizer]);

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
          rowTop(top) -
          element.scrollTop,
        left:
          box.left +
          element.clientLeft +
          GRID_METRICS.rowHeaderWidth +
          colLeft(left) -
          element.scrollLeft,
        width: colLeft(right + 1) - colLeft(left),
        height: rowTop(bottom + 1) - rowTop(top),
      };
    },
    [rowCount, colCount, rowTop, colLeft],
  );

  const getCellViewportRect = useCallback(
    (row: number, col: number) => getRangeViewportRect(row, col, row, col),
    [getRangeViewportRect],
  );

  /** 고정 머리글과 스크롤 막대를 뺀, 셀이 실제로 보이는 영역의 화면 좌표. 마운트 전이면 null. */
  const getCellAreaRect = useCallback((): ViewportRect | null => {
    const element = scrollRef.current;
    if (element === null) return null;
    const box = element.getBoundingClientRect();
    return {
      top: box.top + element.clientTop + GRID_METRICS.colHeaderHeight,
      left: box.left + element.clientLeft + GRID_METRICS.rowHeaderWidth,
      width: Math.max(0, element.clientWidth - GRID_METRICS.rowHeaderWidth),
      height: Math.max(0, element.clientHeight - GRID_METRICS.colHeaderHeight),
    };
  }, []);

  /** 셀이 고정 머리글 뒤로 숨지 않고 완전히 보이도록 최소한만 스크롤한다. 동기적으로 반영된다. */
  const scrollToCell = useCallback(
    (row: number, col: number) => {
      const element = scrollRef.current;
      if (element === null || row < 0 || row >= rowCount || col < 0 || col >= colCount) return;

      const cellTop = rowTop(row);
      const cellHeight = rowSize(row);
      const visibleHeight = element.clientHeight - GRID_METRICS.colHeaderHeight;
      if (cellTop < element.scrollTop) {
        element.scrollTop = cellTop;
      } else if (cellTop + cellHeight > element.scrollTop + visibleHeight) {
        element.scrollTop = cellTop + cellHeight - visibleHeight;
      }

      const cellLeft = colLeft(col);
      const cellWidth = colSize(col);
      const visibleWidth = element.clientWidth - GRID_METRICS.rowHeaderWidth;
      if (cellLeft < element.scrollLeft) {
        element.scrollLeft = cellLeft;
      } else if (cellLeft + cellWidth > element.scrollLeft + visibleWidth) {
        element.scrollLeft = cellLeft + cellWidth - visibleWidth;
      }
    },
    [rowCount, colCount, rowTop, rowSize, colLeft, colSize],
  );

  /** 한 화면에 완전히 보이는 행 수 (PageUp/PageDown 이동 폭). 기본 행 높이로 센다. */
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
    /** 행 시작 위치(열 머리글 아래부터) */
    rowTop,
    /** 열 시작 위치(행 머리글 오른쪽부터) */
    colLeft,
    rowSize,
    colSize,
    getCellViewportRect,
    getRangeViewportRect,
    getCellAreaRect,
    scrollToCell,
    getPageRowCount,
  };
}

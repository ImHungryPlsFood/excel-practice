import { memo } from 'react';

/*
 * 그리드 셀 1칸. 카드 컴포넌트와 섞이지 않도록 둥글기·그림자 없이 격자선과 그리드 토큰만 쓴다 (R-12.25).
 * 마우스 처리는 SpreadsheetGrid가 이벤트 위임으로 하므로 셀은 위치를 data 속성으로만 알린다.
 * 수식 오류 셀은 오류 코드를 오류 색으로 보여 준다. 안내 문장은 수식 입력줄 아래 안내 줄에 나온다(CARD-02C).
 */

interface GridCellProps {
  id: string;
  row: number;
  col: number;
  left: number;
  width: number;
  value: string;
  isError: boolean;
  inRange: boolean;
  isActive: boolean;
}

export const GridCell = memo(function GridCell({
  id,
  row,
  col,
  left,
  width,
  value,
  isError,
  inRange,
  isActive,
}: GridCellProps) {
  return (
    <div
      id={id}
      role="gridcell"
      aria-colindex={col + 2}
      aria-selected={inRange}
      aria-invalid={isError ? true : undefined}
      data-row={row}
      data-col={col}
      className={[
        'absolute top-0 h-full cursor-cell truncate border-r border-b border-grid-line px-1 text-sm leading-6 select-none',
        isError ? 'font-medium text-error' : 'text-fg',
        inRange && !isActive ? 'bg-selected-bg' : 'bg-cell',
      ].join(' ')}
      style={{ left, width }}
    >
      {value}
    </div>
  );
});

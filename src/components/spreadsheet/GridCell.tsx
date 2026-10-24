import { memo } from 'react';

import type { CellValueKind } from './types';

/*
 * 그리드 셀 1칸. 카드 컴포넌트와 섞이지 않도록 둥글기·그림자 없이 격자선과 그리드 토큰만 쓴다 (R-12.25).
 * 마우스 처리는 SpreadsheetGrid가 이벤트 위임으로 하므로 셀은 위치를 data 속성으로만 알린다.
 * 수식 오류 셀은 오류 코드를 오류 색으로 보여 준다. 안내 문장은 수식 입력줄 아래 안내 줄에 나온다(CARD-02C).
 * 서식이 없는 셀은 Excel 기본 표시대로 값 종류에 따라 정렬한다(R-08.22, CARD-02D):
 * 숫자·날짜 오른쪽, 문자 왼쪽, 논리값·오류 가운데.
 */

const ALIGNMENT: Record<CellValueKind, string> = {
  empty: 'text-left',
  text: 'text-left',
  number: 'text-right',
  boolean: 'text-center',
  error: 'text-center',
};

interface GridCellProps {
  id: string;
  row: number;
  col: number;
  left: number;
  width: number;
  value: string;
  kind: CellValueKind;
  readOnly?: boolean;
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
  kind,
  readOnly = false,
  inRange,
  isActive,
}: GridCellProps) {
  const isError = kind === 'error';
  return (
    <div
      id={id}
      role="gridcell"
      aria-colindex={col + 2}
      aria-selected={inRange}
      aria-invalid={isError ? true : undefined}
      data-row={row}
      data-col={col}
      data-kind={kind}
      data-readonly={readOnly ? 'true' : undefined}
      className={[
        'absolute top-0 h-full cursor-cell truncate border-r border-b border-grid-line px-1 text-sm leading-6 select-none',
        ALIGNMENT[kind],
        isError ? 'font-medium text-error' : 'text-fg',
        inRange && !isActive ? 'bg-selected-bg' : readOnly ? 'bg-subtle' : 'bg-cell',
      ].join(' ')}
      style={{ left, width }}
    >
      {value}
    </div>
  );
});

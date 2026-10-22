import { useId, useState, type KeyboardEvent } from 'react';

/*
 * 랜딩 페이지용 스프레드시트 미리보기 (R-04.03).
 * 실제 그리드(CARD-02A)와 수식 엔진(CARD-02B)이 아니라 소개용 축소판이다.
 * 셀 선택·방향키 이동·이름 상자/수식 입력줄 표시는 실제로 동작하며,
 * 합계 값과 수식 문자열은 아래 원본 데이터에서 함께 계산해 서로 어긋나지 않게 한다.
 */

const MONTHS = ['1월', '2월', '3월'] as const;

const BRANCH_SALES: ReadonlyArray<{ branch: string; sales: readonly number[] }> = [
  { branch: '서울', sales: [1240, 1385, 1410] },
  { branch: '부산', sales: [860, 905, 948] },
  { branch: '대구', sales: [612, 590, 655] },
  { branch: '광주', sales: [534, 571, 602] },
];

type CellKind = 'header' | 'text' | 'number' | 'total';

interface PreviewCell {
  display: string;
  formula?: string;
  kind: CellKind;
}

interface CellPosition {
  row: number;
  col: number;
}

const columnLetter = (col: number): string => String.fromCharCode('A'.charCodeAt(0) + col);
const cellAddress = ({ row, col }: CellPosition): string => `${columnLetter(col)}${row + 1}`;
const formatNumber = (value: number): string => value.toLocaleString('ko-KR');
const sum = (values: readonly number[]): number => values.reduce((acc, value) => acc + value, 0);

function buildPreviewGrid(): PreviewCell[][] {
  const firstDataRow = 2;
  const lastDataRow = firstDataRow + BRANCH_SALES.length - 1;
  const firstMonthCol = columnLetter(1);
  const lastMonthCol = columnLetter(MONTHS.length);
  const totalCol = columnLetter(MONTHS.length + 1);

  const header: PreviewCell[] = [
    { display: '지점', kind: 'header' },
    ...MONTHS.map((month): PreviewCell => ({ display: month, kind: 'header' })),
    { display: '합계', kind: 'header' },
  ];

  const dataRows = BRANCH_SALES.map(({ branch, sales }, index): PreviewCell[] => {
    const rowNumber = firstDataRow + index;
    return [
      { display: branch, kind: 'text' },
      ...sales.map((value): PreviewCell => ({ display: formatNumber(value), kind: 'number' })),
      {
        display: formatNumber(sum(sales)),
        formula: `=SUM(${firstMonthCol}${rowNumber}:${lastMonthCol}${rowNumber})`,
        kind: 'number',
      },
    ];
  });

  const monthTotals = MONTHS.map((_, monthIndex) =>
    sum(BRANCH_SALES.map(({ sales }) => sales[monthIndex] ?? 0)),
  );
  const grandTotal = sum(BRANCH_SALES.map(({ sales }) => sum(sales)));

  const totalRow: PreviewCell[] = [
    { display: '합계', kind: 'total' },
    ...monthTotals.map((value, monthIndex): PreviewCell => {
      const col = columnLetter(monthIndex + 1);
      return {
        display: formatNumber(value),
        formula: `=SUM(${col}${firstDataRow}:${col}${lastDataRow})`,
        kind: 'total',
      };
    }),
    {
      display: formatNumber(grandTotal),
      formula: `=SUM(${totalCol}${firstDataRow}:${totalCol}${lastDataRow})`,
      kind: 'total',
    },
  ];

  return [header, ...dataRows, totalRow];
}

const PREVIEW_GRID = buildPreviewGrid();
const ROW_COUNT = PREVIEW_GRID.length;
const COL_COUNT = PREVIEW_GRID[0]?.length ?? 0;
const INITIAL_POSITION: CellPosition = { row: 1, col: COL_COUNT - 1 };

const ARROW_DELTAS: Partial<Record<string, CellPosition>> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
};

const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max - 1);

const CELL_KIND_CLASS: Record<CellKind, string> = {
  header: 'font-semibold text-left',
  text: 'text-left',
  number: 'text-right tabular-nums',
  total: 'text-right font-semibold tabular-nums',
};

export function SpreadsheetPreviewMock() {
  const [active, setActive] = useState<CellPosition>(INITIAL_POSITION);
  const idPrefix = useId();
  const cellId = (position: CellPosition) => `${idPrefix}-${cellAddress(position)}`;
  const activeCell = PREVIEW_GRID[active.row]?.[active.col];

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const delta = ARROW_DELTAS[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    setActive((current) => ({
      row: clamp(current.row + delta.row, ROW_COUNT),
      col: clamp(current.col + delta.col, COL_COUNT),
    }));
  };

  return (
    <figure className="overflow-hidden rounded-lg border border-line-strong bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-line bg-subtle px-4 py-2">
        <span className="text-sm font-medium text-fg">1분기 지점별 매출</span>
        <span className="text-xs text-fg-muted">미리보기</span>
      </div>

      <div className="flex h-(--cc-control-height-sm) items-stretch border-b border-grid-line text-sm">
        <output
          aria-label="이름 상자"
          className="flex w-16 items-center border-r border-grid-line px-2 font-mono"
        >
          {cellAddress(active)}
        </output>
        <span
          aria-hidden="true"
          className="flex items-center border-r border-grid-line px-2 font-mono text-fg-muted italic"
        >
          fx
        </span>
        <output
          aria-label="수식 입력줄"
          className="flex min-w-0 flex-1 items-center truncate px-2 font-mono"
        >
          {activeCell?.formula ?? activeCell?.display}
        </output>
      </div>

      <div className="overflow-x-auto bg-grid">
        <table
          role="grid"
          aria-label="스프레드시트 미리보기"
          aria-activedescendant={cellId(active)}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="w-full min-w-md border-collapse text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          <thead>
            <tr>
              <th aria-hidden="true" className="w-10 border border-grid-line bg-grid-header" />
              {Array.from({ length: COL_COUNT }, (_, col) => (
                <th
                  key={col}
                  scope="col"
                  className={[
                    'h-(--cc-grid-row-height) border border-grid-line px-2 text-xs font-medium',
                    col === active.col
                      ? 'bg-selected-bg text-selected'
                      : 'bg-grid-header text-fg-secondary',
                  ].join(' ')}
                >
                  {columnLetter(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PREVIEW_GRID.map((cells, row) => (
              <tr key={row}>
                <th
                  scope="row"
                  className={[
                    'h-(--cc-grid-row-height) border border-grid-line px-2 text-center text-xs font-medium',
                    row === active.row
                      ? 'bg-selected-bg text-selected'
                      : 'bg-grid-header text-fg-secondary',
                  ].join(' ')}
                >
                  {row + 1}
                </th>
                {cells.map((cell, col) => {
                  const position = { row, col };
                  const isActive = row === active.row && col === active.col;
                  return (
                    <td
                      key={col}
                      id={cellId(position)}
                      role="gridcell"
                      aria-selected={isActive}
                      onClick={() => setActive(position)}
                      className={[
                        'h-(--cc-grid-row-height) cursor-cell border border-grid-line px-2 whitespace-nowrap',
                        CELL_KIND_CLASS[cell.kind],
                        cell.kind === 'total' ? 'border-t-2 border-t-line-strong' : '',
                        isActive
                          ? 'bg-selected-bg outline-2 -outline-offset-2 outline-selected'
                          : 'bg-cell',
                      ].join(' ')}
                    >
                      {cell.display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <figcaption className="border-t border-line px-4 py-2 text-xs text-fg-muted">
        셀을 클릭하거나 방향키로 이동해 수식을 확인해 보세요. 학습 화면에서는 직접 수식을 입력하고
        채점받습니다.
      </figcaption>
    </figure>
  );
}

import { GRID_METRICS } from './hooks/useVirtualGrid';
import type { CellRange } from './types';

/*
 * 그리드 위에 겹쳐 그리는 표시 (CARD-02E). 모두 셀 클릭을 가로막지 않는다(pointer-events-none). 채우기 핸들만 누를 수 있다.
 * - 수식 참조 색 테두리: 편집 중인 수식이 가리키는 범위. 포인트 모드로 넣고 있는 범위는 점선(R-08.02).
 * - 복사·잘라낸 범위 점선(R-08.07). 움직이는 점선 애니메이션은 쓰지 않는다(R-07.31, P-03).
 * - 선택 범위 오른쪽 아래 채우기 핸들과, 끄는 동안의 채우기 미리보기(R-08.10).
 */

const REFERENCE_COLORS = [
  'border-reference-1',
  'border-reference-2',
  'border-reference-3',
  'border-reference-4',
] as const;

export interface OverlayGeometry {
  rowTop: (row: number) => number;
  colLeft: (col: number) => number;
}

function boxStyle(range: CellRange, geometry: OverlayGeometry) {
  const top = GRID_METRICS.colHeaderHeight + geometry.rowTop(range.startRow);
  const left = GRID_METRICS.rowHeaderWidth + geometry.colLeft(range.startCol);
  return {
    top,
    left,
    width: GRID_METRICS.rowHeaderWidth + geometry.colLeft(range.endCol + 1) - left,
    height: GRID_METRICS.colHeaderHeight + geometry.rowTop(range.endRow + 1) - top,
  };
}

const sameRange = (a: CellRange, b: CellRange) =>
  a.startRow === b.startRow &&
  a.startCol === b.startCol &&
  a.endRow === b.endRow &&
  a.endCol === b.endCol;

interface GridOverlaysProps {
  geometry: OverlayGeometry;
  referenceRanges: readonly CellRange[];
  /** 포인트 모드로 넣고 있는 범위 */
  pointRange: CellRange | null;
  marquee: CellRange | null;
  /** 채우기 핸들을 붙일 선택 범위. null이면 핸들 없음 */
  fillSource: CellRange | null;
  fillPreview: CellRange | null;
}

export function GridOverlays({
  geometry,
  referenceRanges,
  pointRange,
  marquee,
  fillSource,
  fillPreview,
}: GridOverlaysProps) {
  return (
    <>
      {referenceRanges.map((range, index) => {
        const isPoint = pointRange !== null && sameRange(range, pointRange);
        return (
          <div
            key={`ref-${index}`}
            aria-hidden="true"
            data-reference-range={index}
            className={[
              'pointer-events-none absolute z-[4] border-2',
              REFERENCE_COLORS[index % REFERENCE_COLORS.length],
              isPoint ? 'border-dashed' : '',
            ].join(' ')}
            style={boxStyle(range, geometry)}
          />
        );
      })}
      {marquee !== null && (
        <div
          aria-hidden="true"
          data-copy-marquee=""
          className="pointer-events-none absolute z-[4] border-2 border-dashed border-selected"
          style={boxStyle(marquee, geometry)}
        />
      )}
      {fillPreview !== null && (
        <div
          aria-hidden="true"
          data-fill-preview=""
          className="pointer-events-none absolute z-[4] border border-dashed border-fg-secondary"
          style={boxStyle(fillPreview, geometry)}
        />
      )}
      {fillSource !== null && (
        <div
          role="presentation"
          title="채우기 핸들: 끌어서 자동 채우기"
          data-fill-handle=""
          className="absolute z-[6] h-2 w-2 cursor-crosshair border border-cell bg-selected"
          style={{
            top: GRID_METRICS.colHeaderHeight + geometry.rowTop(fillSource.endRow + 1) - 4,
            left: GRID_METRICS.rowHeaderWidth + geometry.colLeft(fillSource.endCol + 1) - 4,
          }}
        />
      )}
    </>
  );
}

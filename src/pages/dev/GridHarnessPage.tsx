import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';

import { SpreadsheetGrid } from '@/components/spreadsheet/SpreadsheetGrid';
import type { CellChange, SpreadsheetGridHandle } from '@/components/spreadsheet/types';

/*
 * 개발 전용 그리드 확인 화면 (/dev/grid). 개발 서버와 성능 측정 빌드(--mode perf)에서만 라우트가 등록된다.
 * 실제 샌드박스 화면은 CARD-02D(SandboxPage)에서 만든다.
 *
 * 쿼리: rows, cols (기본 200×26), fill=1이면 모든 셀에 값을 채운다.
 * 채운 값은 함수로 계산해 1,000,000칸이어도 메모리에 쌓지 않고, 사용자가 바꾼 칸만 Map에 둔다.
 */

declare global {
  interface Window {
    /** E2E 테스트가 좌표 API를 호출하기 위한 핸들 참조 (개발·성능 모드 전용) */
    __cellcraftGridRef?: RefObject<SpreadsheetGridHandle | null>;
  }
}

const DEFAULT_ROWS = 200;
const DEFAULT_COLS = 26;
const MAX_ROWS = 10_000;
const MAX_COLS = 100;

function readCount(raw: string | null, fallback: number, max: number): number {
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function GridHarnessPage() {
  const [params] = useSearchParams();
  const rowCount = readCount(params.get('rows'), DEFAULT_ROWS, MAX_ROWS);
  const colCount = readCount(params.get('cols'), DEFAULT_COLS, MAX_COLS);
  const filled = params.get('fill') === '1';

  const [edits, setEdits] = useState<ReadonlyMap<string, string>>(() => new Map());
  const gridRef = useRef<SpreadsheetGridHandle>(null);

  useEffect(() => {
    window.__cellcraftGridRef = gridRef;
    return () => {
      delete window.__cellcraftGridRef;
    };
  }, []);

  const getCellValue = useCallback(
    (row: number, col: number) => {
      const edited = edits.get(`${row}:${col}`);
      if (edited !== undefined) return edited;
      return filled ? String((row + 1) * (col + 1)) : '';
    },
    [edits, filled],
  );

  const handleCellsChange = useCallback((changes: readonly CellChange[]) => {
    setEdits((current) => {
      const next = new Map(current);
      for (const { row, col, value } of changes) next.set(`${row}:${col}`, value);
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-surface px-4 py-2 text-sm">
        <h1 className="font-semibold text-fg">그리드 개발 확인 화면</h1>
        <p className="text-fg-muted">
          개발 전용 화면입니다. {rowCount.toLocaleString('ko-KR')}행 × {colCount}열. 수식은 계산하지
          않고 입력한 글자를 그대로 보관합니다(수식 엔진은 CARD-02B).
        </p>
      </header>
      <SpreadsheetGrid
        ref={gridRef}
        label="개발 확인용 시트"
        rowCount={rowCount}
        colCount={colCount}
        getCellValue={getCellValue}
        onCellsChange={handleCellsChange}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

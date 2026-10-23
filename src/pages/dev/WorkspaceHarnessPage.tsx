import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';

import { Spreadsheet, type SpreadsheetHandle } from '@/components/spreadsheet/Spreadsheet';
import { cellAddress } from '@/components/spreadsheet/hooks/useCellSelection';
import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';
import type { CellPosition } from '@/components/spreadsheet/types';
import { LearningLayout } from '@/features/learning/components/LearningLayout';

/*
 * 개발 전용 학습 작업 공간 확인 화면 (/dev/workspace, CARD-02C).
 * 개발 서버와 성능 측정 빌드(--mode perf)에서만 라우트가 등록된다.
 * LearningLayout + 수식 입력줄 + 그리드 + 수식 엔진을 실제로 연결해 E2E로 검증한다.
 * 학습 설명·문제·힌트 영역은 내용이 생기는 카드(CARD-03A·04A 이후)에서 채우므로 여기서는 넘기지 않는다.
 */

declare global {
  interface Window {
    /** E2E 테스트가 좌표 API를 호출하기 위한 핸들 참조 (개발·성능 모드 전용) */
    __cellcraftWorkspaceRef?: RefObject<SpreadsheetHandle | null>;
  }
}

const ROWS = 100;
const COLS = 26;

/** 예제 데이터(원문). 금액 열은 수식이다. */
const SAMPLE_DATA: readonly (readonly string[])[] = [
  ['품목', '수량', '단가', '금액'],
  ['사과', '3', '1200', '=B2*C2'],
  ['배', '2', '2500', '=B3*C3'],
  ['합계', '', '', '=SUM(D2:D3)'],
];

export function WorkspaceHarnessPage() {
  const workbook = useWorkbook(SAMPLE_DATA);
  const sheetRef = useRef<SpreadsheetHandle>(null);
  const [active, setActive] = useState<CellPosition>({ row: 0, col: 0 });

  useEffect(() => {
    window.__cellcraftWorkspaceRef = sheetRef;
    return () => {
      delete window.__cellcraftWorkspaceRef;
    };
  }, []);

  const result = workbook.getResult(active.row, active.col);
  const status =
    workbook.status === 'loading'
      ? '시트를 준비하는 중'
      : workbook.status === 'error'
        ? '시트를 불러오지 못했습니다'
        : result.error !== null
          ? `${cellAddress(active)}: 오류 ${result.error.code}`
          : `${cellAddress(active)}: ${result.displayValue === '' ? '빈 셀' : result.displayValue}`;

  return (
    <LearningLayout
      header={
        <>
          <h1 className="text-sm font-semibold">학습 작업 공간 개발 확인 화면</h1>
          <span className="text-xs text-fg-muted">개발 전용 · 단원 내용 없음</span>
          <Link to="/dashboard" className="ml-auto text-sm text-brand hover:underline">
            나가기
          </Link>
        </>
      }
      footer={
        <>
          <span role="status" aria-label="작업 상태" className="truncate text-fg-secondary">
            {status}
          </span>
          <button
            type="button"
            onClick={workbook.reset}
            className="ml-auto rounded-md border border-line px-3 py-1 text-sm hover:bg-subtle"
          >
            다시 시작
          </button>
        </>
      }
    >
      <Spreadsheet
        ref={sheetRef}
        workbook={workbook}
        label="작업 시트"
        rowCount={ROWS}
        colCount={COLS}
        onActiveCellChange={setActive}
        className="min-h-0 flex-1"
      />
    </LearningLayout>
  );
}

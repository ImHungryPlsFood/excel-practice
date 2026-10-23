import type { CellEditingController } from './hooks/useCellEditing';

/*
 * 스프레드시트 그리드 공개 타입 (CARD-02A, ADR-002 §4).
 * 행·열 인덱스는 모두 0부터 시작한다. 화면 표기(A1)는 useCellSelection의 cellAddress로 변환한다.
 */

export interface CellPosition {
  row: number;
  col: number;
}

/** 정규화된 범위. start ≤ end가 항상 성립한다. */
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** 뷰포트(브라우저 창) 기준 화면 좌표. DOMRect와 같은 기준이다. */
export interface ViewportRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** 셀 값 변경 1건. value가 빈 문자열이면 셀 내용을 지운 것이다. */
export interface CellChange {
  row: number;
  col: number;
  value: string;
}

/**
 * 그리드 외부(튜토리얼 Spotlight, 학습 화면)에서 쓰는 명령형 API (ADR-002 §4.3).
 * 수식 입력줄 좌표(getFormulaBarRect)는 입력줄과 그리드를 묶은 Spreadsheet의 핸들(SpreadsheetHandle)에 있다(CARD-02C).
 */
export interface SpreadsheetGridHandle {
  /** 셀이 고정 머리글에 가리지 않고 보이도록 뷰포트를 스크롤한다. */
  scrollToCell: (row: number, col: number) => void;
  /**
   * 셀의 화면 좌표. 가상화로 DOM에 없는 셀도 레이아웃 계산값을 돌려준다.
   * 그리드 범위를 벗어난 주소이거나 그리드가 아직 마운트되지 않았으면 null.
   */
  getCellViewportRect: (row: number, col: number) => ViewportRect | null;
  /** 두 모서리 셀을 감싸는 범위의 화면 좌표 (Spotlight 박스용). */
  getRangeViewportRect: (
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ) => ViewportRect | null;
  /** 활성 셀을 바꾸고 범위 선택을 해제한다. */
  selectCell: (row: number, col: number) => void;
  /** 활성 셀 편집을 시작한다. initialChar가 있으면 기존 내용을 그 글자로 바꿔 시작한다. */
  startEditing: (initialChar?: string) => void;
  /** 그리드 입력 상자에 키보드 포커스를 돌려준다(수식 입력줄에서 Esc 등). */
  focus: () => void;
}

/** 셀 화면 표시. 수식 셀이면 계산 결과, 오류면 오류 코드다. */
export interface CellDisplay {
  text: string;
  isError: boolean;
}

export interface SpreadsheetGridProps {
  rowCount: number;
  colCount: number;
  /** 셀 원문. 편집을 시작하면 이 값이 편집기에 들어간다. */
  getCellValue: (row: number, col: number) => string;
  /** 셀 화면 표시(수식 계산 결과). 없으면 원문을 그대로 보여 준다. */
  getCellDisplay?: (row: number, col: number) => CellDisplay;
  /** 편집 확정(공유 편집 컨트롤러가 없을 때)·내용 삭제 시 호출된다. 그리드는 값을 직접 보관하지 않는다. */
  onCellsChange: (changes: readonly CellChange[]) => void;
  /** 활성 셀이 바뀔 때 호출된다. */
  onActiveCellChange?: (position: CellPosition) => void;
  /** 수식 입력줄과 함께 쓰는 편집 컨트롤러(CARD-02C). 없으면 그리드가 직접 만든다. */
  editor?: CellEditingController;
  /** 접근성 이름 */
  label: string;
  className?: string;
}

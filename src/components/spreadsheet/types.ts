import type { FillDirection } from '@/engine/spreadsheet/operations/autoFill';

import type { CellEditingController } from './hooks/useCellEditing';
import type { PointModeController } from './hooks/usePointMode';

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

/**
 * 셀 값 종류 (R-08.22, CARD-02D). 서식이 없는 셀의 기본 정렬을 정한다(Excel 기본 표시).
 * 원문 글자가 아니라 계산 결과의 종류로 정하므로 '123처럼 문자로 저장한 숫자는 text다.
 */
export type CellValueKind = 'empty' | 'number' | 'text' | 'boolean' | 'error';

/** 셀 화면 표시. 수식 셀이면 계산 결과, 오류면 오류 코드다. */
export interface CellDisplay {
  text: string;
  /** 값 종류. 숫자·날짜는 오른쪽, 문자는 왼쪽, 논리값·오류는 가운데 정렬된다. */
  kind: CellValueKind;
}

/** 행 높이·열 너비 (CARD-02E). 기본 크기면 undefined를 돌려준다. */
export interface GridLayout {
  /** 크기가 바뀌면 달라지는 값. 그리드가 위치를 다시 계산하는 기준이다. */
  key: string;
  getColumnWidth: (col: number) => number | undefined;
  getRowHeight: (row: number) => number | undefined;
}

/** 그리드의 복사·잘라내기·붙여넣기 연결 (CARD-02E, useClipboard) */
export interface GridClipboard {
  /** 점선으로 보여 줄 복사·잘라낸 범위(지금 보는 시트에 있을 때) */
  marquee: CellRange | null;
  /** 복사·잘라내기. data가 있으면(Ctrl+C·X 이벤트) 시스템 클립보드에 직접 쓴다. */
  copy: (range: CellRange, cut: boolean, data: DataTransfer | null) => void;
  /** 붙여넣기. text가 null이면(메뉴) 앱 안 클립보드나 시스템 클립보드를 읽는다. 붙여넣은 범위를 돌려준다. */
  paste: (range: CellRange, text: string | null) => CellRange | null;
  /** 복사 표시를 지운다(Esc). 지울 것이 있었으면 true */
  clear: () => boolean;
}

/** 행·열 메뉴 동작 (CARD-02E, R-08.06) */
export interface GridStructureActions {
  /** index부터 count개 행·열 삽입·삭제 */
  change: (axis: 'row' | 'col', kind: 'insert' | 'delete', index: number, count: number) => void;
  /** 열 너비·행 높이. size가 null이면 기본값 */
  resize: (axis: 'row' | 'col', indexes: readonly number[], size: number | null) => void;
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
  /** 선택 범위(활성 셀 하나도 한 칸 범위)가 바뀔 때 호출된다. 처음 그려질 때는 부르지 않는다. */
  onSelectionChange?: (range: CellRange) => void;
  /** 수식 입력줄과 함께 쓰는 편집 컨트롤러(CARD-02C). 없으면 그리드가 직접 만든다. */
  editor?: CellEditingController;
  /** 편집 중이 아닐 때 Ctrl+Z (CARD-02D). 없으면 브라우저 기본 동작을 막기만 한다. */
  onUndo?: () => void;
  /** 편집 중이 아닐 때 Ctrl+Y·Ctrl+Shift+Z */
  onRedo?: () => void;
  /** 행 높이·열 너비. 없으면 모두 기본 크기 (CARD-02E) */
  layout?: GridLayout;
  /** 행·열 삽입·삭제·크기 조절. 없으면 머리글 메뉴·크기 끌기를 쓰지 않는다. */
  structure?: GridStructureActions;
  /** 복사·붙여넣기 (Ctrl+C/X/V) */
  clipboard?: GridClipboard;
  /** 채우기 핸들 끌기 */
  onFill?: (source: CellRange, direction: FillDirection, count: number) => void;
  /** Ctrl+D·Ctrl+R */
  onFillFromEdge?: (selection: CellRange, direction: 'down' | 'right') => void;
  /** 수식 편집 중 셀 클릭으로 참조 넣기 (CARD-02E). 없으면 셀 클릭은 늘 확정·선택이다. */
  pointMode?: PointModeController;
  /** 수식 속 참조를 색 테두리로 보여 줄 범위(지금 보는 시트 기준) */
  referenceRanges?: readonly CellRange[];
  /** 편집 중인 셀이 다른 시트에 있다(포인트 모드로 시트를 옮겨 봄). 셀 위 편집기를 숨긴다. */
  editingElsewhere?: boolean;
  /** Ctrl+PageUp/PageDown·Ctrl+Shift+PageUp/PageDown 시트 이동 (Q-06) */
  onSheetNavigate?: (delta: 1 | -1) => void;
  /** 접근성 이름 */
  label: string;
  className?: string;
}

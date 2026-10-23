/*
 * 수식 엔진 추상화 계층 (CARD-02B, ADR-001 §5, TECHNICAL_DESIGN §3).
 * 앱 코드(그리드·학습 화면·채점기)는 이 인터페이스만 사용하고 HyperFormula를 직접 import하지 않는다.
 * 행·열 인덱스는 그리드(CARD-02A)와 같이 0부터 시작한다.
 */

export type CellScalar = string | number | boolean | null;

/**
 * Excel 표기 그대로의 오류 코드. ADR-001·TECHNICAL_DESIGN 초안의 '#N/A!'는 Excel 표기 '#N/A'로 바로잡았다.
 * '#CYCLE!'(순환 참조)와 '#ERROR!'(구문 오류)는 Excel에 없는 엔진 고유 코드다 (docs/EXCEL_DIFFERENCES.md).
 */
export type CellErrorCode =
  | '#DIV/0!'
  | '#VALUE!'
  | '#REF!'
  | '#NAME?'
  | '#NUM!'
  | '#N/A'
  | '#NULL!'
  | '#SPILL!'
  | '#CYCLE!'
  | '#ERROR!';

export interface CellError {
  code: CellErrorCode;
  /** 사용자에게 보여 줄 한국어 설명 (R-08.23). */
  message: string;
}

/** 표시 형식 힌트. 셀 서식 기능(Phase 7) 전까지는 엔진이 추론한 형식만 담는다. */
export type CellFormatHint = 'general' | 'date' | 'percent';

export interface CellResult {
  /** 계산된 값. 오류면 null이고 error에 내용이 들어간다. */
  value: CellScalar;
  /** 셀에 보여 줄 문자열 (R-08.22). */
  displayValue: string;
  error: CellError | null;
  /** 수식 셀이면 사용자가 입력한 수식 원문. 값 셀이면 없음 (MASTER_PROMPT §8.2 수식·결과 분리 저장). */
  formula?: string;
  format?: CellFormatHint;
}

export interface CellAddress {
  sheet: string;
  row: number;
  col: number;
}

export interface FormulaEngineAdapter {
  readonly id: string;
  readonly version: string;

  // 라이프사이클 및 초기화
  initWorkbook(sheets: Record<string, CellScalar[][]>): Promise<void>;
  /**
   * 통합 문서 전체를 즉시 다시 만든다 (CARD-02D). 실행 취소처럼 화면이 기다릴 수 없는 교체에 쓴다.
   * 제한(S-09)을 넘으면 FormulaEngineInputError를 던지고 기존 상태를 그대로 둔다.
   */
  loadSheets(sheets: Record<string, CellScalar[][]>): void;
  destroy(): void;

  // 셀 조작. '='로 시작하는 문자열은 수식, 그 밖의 값은 상수로 저장한다.
  setCellContent(sheetName: string, row: number, col: number, content: string | CellScalar): void;
  getCellValue(sheetName: string, row: number, col: number): CellResult;
  getCellFormula(sheetName: string, row: number, col: number): string | null;

  // 시트 전체 스냅샷 (값이 있는 영역까지)
  getSheetGrid(sheetName: string): CellResult[][];

  // 의존성 수동 재계산. 셀 변경 시에는 자동으로 재계산되므로 보통은 부를 필요가 없다.
  recalculate(): void;

  // 워크시트 관리
  addSheet(sheetName: string): void;
  renameSheet(oldName: string, newName: string): void;
  deleteSheet(sheetName: string): void;

  // 함수 및 메타데이터
  isFunctionSupported(funcName: string): boolean;
  /** 셀 수식이 직접 참조하는 셀 목록. 범위 참조는 낱개 셀로 펼친다. */
  getDependencies(sheetName: string, row: number, col: number): CellAddress[];
  /** 이 셀의 값을 바꾸면 다시 계산되는 셀 목록 (직접·간접 모두). */
  getDependents(sheetName: string, row: number, col: number): CellAddress[];
}

/** 입력 제한(S-09)이나 존재하지 않는 시트처럼 엔진이 내용을 받아들이지 않을 때 던진다. */
export class FormulaEngineInputError extends Error {
  override readonly name = 'FormulaEngineInputError';
}

/** S-09 수식 엔진 남용 방지 상한 (THREAT_MODEL §S-09, 실습 모드 기준). */
export const ENGINE_LIMITS = {
  maxFormulaLength: 1000,
  maxRows: 1000,
  maxColumns: 50,
} as const;

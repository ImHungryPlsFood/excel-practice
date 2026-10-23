/*
 * HyperFormula 기반 FormulaEngineAdapter 구현 (CARD-02B, ADR-001 §4.1).
 * HyperFormula는 GPLv3로 사용한다(licenseKey: 'gpl-v3'). 앱의 다른 코드는 이 파일 밖에서 hyperformula를 import하지 않는다.
 * Excel과 맞추기 위한 설정과 남는 차이는 docs/EXCEL_DIFFERENCES.md에 근거와 함께 적는다.
 */

import {
  CellValueDetailedType,
  DetailedCellError,
  ErrorType,
  HyperFormula,
  type ConfigParams,
  type SerializedNamedExpression,
  type SimpleCellAddress,
  type SimpleCellRange,
} from 'hyperformula';

import {
  ENGINE_LIMITS,
  FormulaEngineInputError,
  type CellAddress,
  type CellErrorCode,
  type CellResult,
  type CellScalar,
  type FormulaEngineAdapter,
} from '../FormulaEngineAdapter';
import { describeError } from '../errorMessages';
import { formatSerialAsIsoDate } from '../dateSerial';
import { DependencyGraph } from '../evaluator/dependencyGraph';
import { formatGeneralNumber } from '../numberFormat';
import { EXCEL_COMPAT_TRANSLATIONS, ExcelCompatPlugin } from './excelCompatPlugin';

// CONCAT 추가, INDEX를 Excel 동작으로 교체한다. 함수 등록은 HyperFormula 전역이며 같은 플러그인을 다시 등록해도 덮어쓸 뿐이다.
HyperFormula.registerFunctionPlugin(ExcelCompatPlugin, EXCEL_COMPAT_TRANSLATIONS);

const ENGINE_CONFIG: Partial<ConfigParams> = {
  licenseKey: 'gpl-v3',
  useArrayArithmetic: true,
  useColumnIndex: true,
  // Excel 1900 날짜 체계: 1900-01-01 = 1, 존재하지 않는 1900-02-29 = 60 (Q-07, dateSerial.ts)
  leapYear1900: true,
  nullDate: { year: 1899, month: 12, day: 31 },
  // 한국 로케일 날짜 입력(2024-03-15, 2024/03/15)을 날짜로 인식
  dateFormats: ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM/DD/YYYY'],
  // Excel처럼 빈 셀 참조(=Z9)를 0으로 계산
  evaluateNullToZero: true,
  // HyperFormula 기본값은 결과를 10자리로 반올림한다. Excel처럼 배정밀도 값을 그대로 둔다.
  smartRounding: false,
  // Excel 조건 함수(COUNTIF 등) 규칙: 대소문자 무시, 셀 전체 일치, 와일드카드(*, ?) 사용
  caseSensitive: false,
  // Excel은 악센트를 구분한다("café" ≠ "cafe"). HyperFormula 기본값(false)은 문자열을 NFD로 분해해 비교하는데,
  // 이때 한글 음절이 자모로 쪼개져 와일드카드 ?가 한 글자와 맞지 않는다(COUNTIF(H2:H7,"?발") 골든 불일치의 원인).
  accentSensitive: true,
  matchWholeCell: true,
  useWildcards: true,
  useRegularExpressions: false,
  // S-09 시트 크기 상한
  maxRows: ENGINE_LIMITS.maxRows,
  maxColumns: ENGINE_LIMITS.maxColumns,
};

// HyperFormula에서 TRUE·FALSE는 함수(TRUE())라서 Excel처럼 =IF(TRUE, …)로 쓰려면 이름으로 등록해야 한다.
const NAMED_EXPRESSIONS: SerializedNamedExpression[] = [
  { name: 'TRUE', expression: '=TRUE()' },
  { name: 'FALSE', expression: '=FALSE()' },
];

const ERROR_CODES: Record<ErrorType, CellErrorCode> = {
  [ErrorType.DIV_BY_ZERO]: '#DIV/0!',
  [ErrorType.NAME]: '#NAME?',
  [ErrorType.VALUE]: '#VALUE!',
  [ErrorType.NUM]: '#NUM!',
  [ErrorType.NA]: '#N/A',
  [ErrorType.CYCLE]: '#CYCLE!',
  [ErrorType.REF]: '#REF!',
  [ErrorType.SPILL]: '#SPILL!',
  [ErrorType.LIC]: '#ERROR!',
  [ErrorType.ERROR]: '#ERROR!',
};

const DATE_TYPES = new Set<CellValueDetailedType>([
  CellValueDetailedType.NUMBER_DATE,
  CellValueDetailedType.NUMBER_DATETIME,
]);

function isRange(reference: SimpleCellRange | SimpleCellAddress): reference is SimpleCellRange {
  return 'start' in reference;
}

function cellKey(sheet: number, row: number, col: number): string {
  return `${sheet}:${row}:${col}`;
}

function isFormula(content: string | CellScalar): content is string {
  return typeof content === 'string' && content.startsWith('=');
}

function checkContent(content: string | CellScalar): void {
  if (isFormula(content) && content.length > ENGINE_LIMITS.maxFormulaLength) {
    throw new FormulaEngineInputError(
      `수식은 ${ENGINE_LIMITS.maxFormulaLength}자까지 입력할 수 있습니다 (현재 ${content.length}자).`,
    );
  }
}

function checkPosition(row: number, col: number): void {
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(col) ||
    row < 0 ||
    col < 0 ||
    row >= ENGINE_LIMITS.maxRows ||
    col >= ENGINE_LIMITS.maxColumns
  ) {
    throw new FormulaEngineInputError(
      `셀 위치가 허용 범위(${ENGINE_LIMITS.maxRows}행 × ${ENGINE_LIMITS.maxColumns}열)를 벗어났습니다.`,
    );
  }
}

export class HyperFormulaAdapter implements FormulaEngineAdapter {
  readonly id = 'hyperformula';
  readonly version = HyperFormula.version;

  private engine: HyperFormula;
  private readonly graph = new DependencyGraph();
  private readonly registeredFunctions: ReadonlySet<string>;

  constructor() {
    this.engine = HyperFormula.buildEmpty(ENGINE_CONFIG, NAMED_EXPRESSIONS);
    this.registeredFunctions = new Set(this.engine.getRegisteredFunctionNames());
  }

  async initWorkbook(sheets: Record<string, CellScalar[][]>): Promise<void> {
    // 엔진을 바꾸기 전에 모든 셀을 검사해, 제한을 넘는 통합 문서는 기존 상태를 건드리지 않고 거부한다.
    for (const rows of Object.values(sheets)) {
      rows.forEach((cells, row) => {
        if (cells.length > 0) {
          checkPosition(row, cells.length - 1);
        }
        cells.forEach(checkContent);
      });
    }
    const next = HyperFormula.buildFromSheets(sheets, ENGINE_CONFIG, NAMED_EXPRESSIONS);
    this.engine.destroy();
    this.engine = next;
    this.rebuildGraph();
  }

  destroy(): void {
    this.engine.destroy();
    this.graph.clear();
  }

  setCellContent(sheetName: string, row: number, col: number, content: string | CellScalar): void {
    checkPosition(row, col);
    checkContent(content);
    const sheet = this.sheetId(sheetName);
    this.engine.setCellContents({ sheet, row, col }, [[content]]);
    this.updateGraphFor(sheet, row, col);
  }

  getCellValue(sheetName: string, row: number, col: number): CellResult {
    checkPosition(row, col);
    const sheet = this.sheetId(sheetName);
    const address = { sheet, row, col };
    const formula = this.engine.getCellFormula(address);
    const raw = this.engine.getCellValue(address);
    const base = formula === undefined ? {} : { formula };

    // 엔진 판정과 별개로 자체 DAG에서도 순환이면 #CYCLE!로 본다(무한 루프 방어 이중화).
    const code: CellErrorCode | null = this.graph.isInCycle(cellKey(sheet, row, col))
      ? '#CYCLE!'
      : raw instanceof DetailedCellError
        ? ERROR_CODES[raw.type]
        : null;
    if (code) {
      return {
        ...base,
        value: null,
        displayValue: code,
        error: {
          code,
          message: describeError(code, formula, {
            isFunctionSupported: (name) => this.isFunctionSupported(name),
            isValidFormula: (text) => this.engine.validateFormula(text),
          }),
        },
      };
    }

    if (typeof raw === 'number') {
      const type = this.engine.getCellValueDetailedType(address);
      if (DATE_TYPES.has(type)) {
        const iso = formatSerialAsIsoDate(raw);
        if (iso) {
          return { ...base, value: raw, displayValue: iso, error: null, format: 'date' };
        }
      }
      if (type === CellValueDetailedType.NUMBER_PERCENT) {
        return {
          ...base,
          value: raw,
          displayValue: `${formatGeneralNumber(raw * 100)}%`,
          error: null,
          format: 'percent',
        };
      }
      return {
        ...base,
        value: raw,
        displayValue: formatGeneralNumber(raw),
        error: null,
        format: 'general',
      };
    }
    if (typeof raw === 'boolean') {
      return { ...base, value: raw, displayValue: raw ? 'TRUE' : 'FALSE', error: null };
    }
    if (typeof raw === 'string') {
      return { ...base, value: raw, displayValue: raw, error: null };
    }
    return { ...base, value: null, displayValue: '', error: null };
  }

  getCellFormula(sheetName: string, row: number, col: number): string | null {
    checkPosition(row, col);
    return this.engine.getCellFormula({ sheet: this.sheetId(sheetName), row, col }) ?? null;
  }

  getSheetGrid(sheetName: string): CellResult[][] {
    const { height, width } = this.engine.getSheetDimensions(this.sheetId(sheetName));
    return Array.from({ length: height }, (_, row) =>
      Array.from({ length: width }, (__, col) => this.getCellValue(sheetName, row, col)),
    );
  }

  recalculate(): void {
    this.engine.rebuildAndRecalculate();
    this.rebuildGraph();
  }

  addSheet(sheetName: string): void {
    if (!this.engine.isItPossibleToAddSheet(sheetName)) {
      throw new FormulaEngineInputError(`시트를 추가할 수 없습니다: ${sheetName}`);
    }
    this.engine.addSheet(sheetName);
    // 새 시트 이름을 기다리던 #REF! 수식이 다시 연결될 수 있으므로 그래프를 새로 만든다.
    this.rebuildGraph();
  }

  renameSheet(oldName: string, newName: string): void {
    this.engine.renameSheet(this.sheetId(oldName), newName);
    this.rebuildGraph();
  }

  deleteSheet(sheetName: string): void {
    this.engine.removeSheet(this.sheetId(sheetName));
    this.rebuildGraph();
  }

  isFunctionSupported(funcName: string): boolean {
    return this.registeredFunctions.has(funcName.toUpperCase());
  }

  getDependencies(sheetName: string, row: number, col: number): CellAddress[] {
    checkPosition(row, col);
    return this.toAddresses(this.graph.getPrecedents(cellKey(this.sheetId(sheetName), row, col)));
  }

  getDependents(sheetName: string, row: number, col: number): CellAddress[] {
    checkPosition(row, col);
    return this.toAddresses(
      this.graph.getTransitiveDependents(cellKey(this.sheetId(sheetName), row, col)),
    );
  }

  private sheetId(sheetName: string): number {
    const id = this.engine.getSheetId(sheetName);
    if (id === undefined) {
      throw new FormulaEngineInputError(`시트를 찾을 수 없습니다: ${sheetName}`);
    }
    return id;
  }

  /** 엔진이 파싱한 참조(getCellPrecedents)로 그래프 간선을 만든다. 범위는 시트 상한 안에서 낱개 셀로 펼친다. */
  private updateGraphFor(sheet: number, row: number, col: number): void {
    const key = cellKey(sheet, row, col);
    if (!this.engine.doesCellHaveFormula({ sheet, row, col })) {
      this.graph.removePrecedents(key);
      return;
    }
    const targets: string[] = [];
    for (const reference of this.engine.getCellPrecedents({ sheet, row, col })) {
      if (isRange(reference)) {
        const { start, end } = reference;
        const lastRow = Math.min(end.row, ENGINE_LIMITS.maxRows - 1);
        const lastCol = Math.min(end.col, ENGINE_LIMITS.maxColumns - 1);
        for (let r = start.row; r <= lastRow; r += 1) {
          for (let c = start.col; c <= lastCol; c += 1) {
            targets.push(cellKey(start.sheet, r, c));
          }
        }
      } else {
        targets.push(cellKey(reference.sheet, reference.row, reference.col));
      }
    }
    this.graph.setPrecedents(key, targets);
  }

  private rebuildGraph(): void {
    this.graph.clear();
    for (const name of this.engine.getSheetNames()) {
      const sheet = this.sheetId(name);
      this.engine.getSheetFormulas(sheet).forEach((cells, row) => {
        cells.forEach((formula, col) => {
          if (formula !== undefined) {
            this.updateGraphFor(sheet, row, col);
          }
        });
      });
    }
  }

  private toAddresses(keys: string[]): CellAddress[] {
    return keys.map((key) => {
      const [sheet = 0, row = 0, col = 0] = key.split(':').map(Number);
      return { sheet: this.engine.getSheetName(sheet) ?? '', row, col };
    });
  }
}

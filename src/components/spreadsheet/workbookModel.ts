import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import {
  ENGINE_LIMITS,
  FormulaEngineInputError,
  type CellResult,
  type CellScalar,
  type FormulaEngineAdapter,
} from '@/engine/spreadsheet/FormulaEngineAdapter';
import { HistoryManager, type Command } from '@/engine/spreadsheet/history/historyManager';
import {
  copyFillWrites,
  fillWrites,
  type FillDirection,
} from '@/engine/spreadsheet/operations/autoFill';
import {
  moveCells as moveSheetCells,
  pasteWrites,
  type PasteSource,
} from '@/engine/spreadsheet/operations/clipboard';
import type {
  CellMove,
  CellRect,
  StructuralChange,
} from '@/engine/spreadsheet/operations/referenceShift';
import {
  applyStructuralChange,
  isValidSize,
  sizeKey,
  sizeKeyIndex,
} from '@/engine/spreadsheet/operations/rowColumnOps';

import type { AllowedAction } from '@/types/problem.schema';

import { parseCellReference } from './formulaReference';
import { cellAddress } from './hooks/useCellSelection';
import type { CellChange } from './types';

/*
 * 여러 시트 통합 문서 모델 (CARD-02D, R-04.49, R-04.51, R-08.08, R-08.12).
 * 수식 엔진 + 시트 순서 + 시트별 원문(사용자가 입력한 글자 그대로)을 함께 다루고,
 * 모든 변경을 historyManager 명령으로 실행해 실행 취소·다시 실행이 된다.
 * React와 분리해 두어 속성 기반 테스트(Q-04)가 실제 엔진 위에서 돌 수 있다.
 *
 * - 셀 입력: 바뀐 셀의 이전·이후 원문만 기록한다.
 * - 시트 추가·이름 변경·삭제, 통합 문서 교체(빈 시트·파일 불러오기·다시 시작), 샘플 불러오기:
 *   이전·이후 전체 스냅샷을 기록하고, 원문에서 엔진을 다시 만든다(loadSheets).
 *   HyperFormula 3.5.0의 시트 삭제·재추가를 이어 쓰면 내부 의존 그래프에 지워진 시트 번호가 남아
 *   이후 작업이 "There's no sheet with id = N"으로 실패하는 경우가 속성 테스트(Q-04)에서 재현되었다.
 *   원문을 기준으로 다시 만들면 엔진 상태가 항상 원문과 같다.
 * - 이름 변경 시 엔진이 다른 시트 수식 속 시트 이름을 바꿔 쓰므로(='My Data'!A1) 그 수식 원문도 함께 맞춘다.
 *
 * CARD-02E: 행·열 삽입·삭제, 잘라내서 붙여넣기, 시트 순서는 스냅샷 명령이다. 수식 참조는 원문 토큰을 고쳐
 * (operations/referenceShift.ts) 원문과 엔진이 늘 같다. 붙여넣기·자동 채우기는 셀 입력 명령,
 * 행 높이·열 너비는 크기만 되돌리는 명령이다(엔진을 다시 만들 필요가 없다).
 */

export const DEFAULT_SHEET = 'Sheet1';
export const MAX_SHEETS = 20;
export const MAX_SHEET_NAME_LENGTH = 31;

/**
 * 시트 하나의 원문. 키는 A1 주소, 값은 입력 원문(빈 셀은 넣지 않는다).
 * 크기는 기본값과 다른 것만 둔다(열 너비는 열 문자, 행 높이는 1부터 시작하는 행 번호가 키. CARD-02E).
 */
export interface SheetSnapshot {
  readonly name: string;
  readonly cells: Readonly<Record<string, string>>;
  readonly columnWidths?: Readonly<Record<string, number>>;
  readonly rowHeights?: Readonly<Record<string, number>>;
}

export interface WorkbookSnapshot {
  readonly sheets: readonly SheetSnapshot[];
  /** 보고 있던 시트. 없거나 목록에 없으면 첫 시트 */
  readonly activeSheet?: string;
}

/** 통합 문서 명령. 실행 취소·다시 실행 뒤 보여 줄 시트를 알려 준다. */
export interface WorkbookCommand extends Command {
  /** apply 직후 보여 줄 시트 */
  readonly sheetAfter: () => string;
  /** revert 직후 보여 줄 시트 */
  readonly sheetBefore: () => string;
}

const EMPTY_RESULT: CellResult = { value: null, displayValue: '', error: null };

const keyOf = (row: number, col: number) => `${row}:${col}`;

function positionOf(key: string): { row: number; col: number } {
  const [row = 0, col = 0] = key.split(':').map(Number);
  return { row, col };
}

/** 원문을 엔진 입력으로. 빈 문자열은 셀 지우기다. 숫자·논리값 해석은 엔진이 한다. */
const toEngineContent = (raw: string): CellScalar => (raw === '' ? null : raw);

const FORBIDDEN_SHEET_CHARACTERS = /[[\]:*?/\\]/;

/**
 * Excel 시트 이름 규칙. 문제가 있으면 한국어 안내 문장, 없으면 null.
 * @param existing 지금 있는 시트 이름들
 * @param self 이름을 바꾸는 중인 시트(자기 이름과의 중복은 허용)
 */
export function validateSheetName(
  name: string,
  existing: readonly string[],
  self?: string,
): string | null {
  if (name.trim() === '') return '시트 이름을 입력하세요.';
  if (name.length > MAX_SHEET_NAME_LENGTH) {
    return `시트 이름은 ${MAX_SHEET_NAME_LENGTH}자까지 쓸 수 있습니다.`;
  }
  if (FORBIDDEN_SHEET_CHARACTERS.test(name)) {
    return '시트 이름에는 [ ] : * ? / \\ 문자를 쓸 수 없습니다.';
  }
  if (name.startsWith("'") || name.endsWith("'")) {
    return "시트 이름은 작은따옴표(')로 시작하거나 끝날 수 없습니다.";
  }
  const lower = name.toLocaleLowerCase();
  const duplicate = existing.some((other) => other !== self && other.toLocaleLowerCase() === lower);
  if (duplicate) return `같은 이름의 시트가 이미 있습니다: ${name}`;
  return null;
}

/** A1 주소를 0부터 시작하는 위치로. 엔진 상한 밖이거나 형식이 다르면 null. */
export function parseA1(address: string): { row: number; col: number } | null {
  const parts = parseCellReference(address);
  if (parts === null || parts.colAbsolute || parts.rowAbsolute) return null;
  const col =
    [...parts.column.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const row = parts.row - 1;
  if (row >= ENGINE_LIMITS.maxRows || col >= ENGINE_LIMITS.maxColumns) return null;
  return { row, col };
}

/**
 * 스냅샷이 엔진에 들어갈 수 있는지 검사한다(파일 불러오기처럼 밖에서 온 스냅샷용).
 * 문제가 있으면 안내 문장, 없으면 null.
 */
export function checkSnapshot(snapshot: WorkbookSnapshot): string | null {
  if (snapshot.sheets.length === 0) return '시트가 하나 이상 있어야 합니다.';
  if (snapshot.sheets.length > MAX_SHEETS) {
    return `시트는 ${MAX_SHEETS}개까지 만들 수 있습니다.`;
  }
  const names: string[] = [];
  for (const sheet of snapshot.sheets) {
    const nameProblem = validateSheetName(sheet.name, names);
    if (nameProblem !== null) return nameProblem;
    names.push(sheet.name);
    for (const [address, raw] of Object.entries(sheet.cells)) {
      if (parseA1(address) === null) {
        return `${sheet.name} 시트의 셀 주소가 올바르지 않거나 허용 범위(${ENGINE_LIMITS.maxRows}행 × ${ENGINE_LIMITS.maxColumns}열)를 벗어났습니다: ${address}`;
      }
      if (raw.startsWith('=') && raw.length > ENGINE_LIMITS.maxFormulaLength) {
        return `${sheet.name}!${address}: 수식은 ${ENGINE_LIMITS.maxFormulaLength}자까지 입력할 수 있습니다.`;
      }
    }
    const sizeProblem =
      checkSizes(sheet.name, sheet.columnWidths, 'col') ??
      checkSizes(sheet.name, sheet.rowHeights, 'row');
    if (sizeProblem !== null) return sizeProblem;
  }
  return null;
}

function checkSizes(
  sheetName: string,
  sizes: Readonly<Record<string, number>> | undefined,
  axis: 'row' | 'col',
): string | null {
  if (sizes === undefined) return null;
  const limit = axis === 'col' ? ENGINE_LIMITS.maxColumns : ENGINE_LIMITS.maxRows;
  const label = axis === 'col' ? '열 너비' : '행 높이';
  for (const [key, size] of Object.entries(sizes)) {
    const index = sizeKeyIndex(key, axis);
    if (index === null || index >= limit) {
      return `${sheetName} 시트의 ${label} 위치가 올바르지 않습니다: ${key}`;
    }
    if (!isValidSize(size, axis)) {
      return `${sheetName} 시트의 ${label} 값이 허용 범위를 벗어났습니다: ${key}`;
    }
  }
  return null;
}

/** 행 우선 원문 배열(단일 시트)을 스냅샷으로 */
export function snapshotFromRows(
  rows: readonly (readonly string[])[],
  name: string = DEFAULT_SHEET,
): WorkbookSnapshot {
  return { sheets: [{ name, cells: cellsFromRows(rows) }] };
}

export function cellsFromRows(rows: readonly (readonly string[])[]): Record<string, string> {
  const cells: Record<string, string> = {};
  rows.forEach((values, row) =>
    values.forEach((raw, col) => {
      if (raw !== '') cells[cellAddress({ row, col })] = raw;
    }),
  );
  return cells;
}

interface SheetState {
  name: string;
  inputs: Map<string, string>;
  /** 기본값과 다른 열 너비·행 높이 (키: 0부터 시작하는 위치) */
  columnWidths: Map<number, number>;
  rowHeights: Map<number, number>;
}

function sizesFromRecord(
  sizes: Readonly<Record<string, number>> | undefined,
  axis: 'row' | 'col',
): Map<number, number> {
  const map = new Map<number, number>();
  for (const [key, size] of Object.entries(sizes ?? {})) {
    const index = sizeKeyIndex(key, axis);
    if (index !== null) map.set(index, size);
  }
  return map;
}

function sizesToRecord(
  sizes: ReadonlyMap<number, number>,
  axis: 'row' | 'col',
): Record<string, number> | undefined {
  if (sizes.size === 0) return undefined;
  const record: Record<string, number> = {};
  for (const [index, size] of [...sizes].sort(([a], [b]) => a - b)) {
    record[sizeKey(index, axis)] = size;
  }
  return record;
}

function sheetStateFrom(sheet: SheetSnapshot): SheetState {
  return {
    name: sheet.name,
    inputs: inputsFromCells(sheet.cells),
    columnWidths: sizesFromRecord(sheet.columnWidths, 'col'),
    rowHeights: sizesFromRecord(sheet.rowHeights, 'row'),
  };
}

function inputsFromCells(cells: Readonly<Record<string, string>>): Map<string, string> {
  const inputs = new Map<string, string>();
  for (const [address, raw] of Object.entries(cells)) {
    const position = parseA1(address);
    if (position !== null && raw !== '') inputs.set(keyOf(position.row, position.col), raw);
  }
  return inputs;
}

function denseRows(inputs: ReadonlyMap<string, string>): CellScalar[][] {
  const rows: CellScalar[][] = [];
  for (const [key, raw] of inputs) {
    const { row, col } = positionOf(key);
    const cells = (rows[row] ??= []);
    cells[col] = toEngineContent(raw);
  }
  // 빈 자리(희소 배열 구멍)를 null로 채운다
  return Array.from(rows, (cells) => Array.from(cells ?? [], (cell) => cell ?? null));
}

/** 수정할 수 없는 영역 (문제의 readOnlyRanges, CARD-04D). 키는 시트 이름, 값은 "A1:D1" 같은 범위 */
export type ReadOnlyRanges = Readonly<Record<string, readonly string[]>>;

/**
 * 문제가 허용한 작업 (문제의 allowedActions, CARD-04E). undefined면 제한하지 않는다(연습실·튜토리얼).
 * 실행 취소·다시 실행·다시 시작, 시트 탭 조작은 어느 경우에도 허용한다.
 * FORMAT_CELLS는 아직 서식 기능이 없어 강제할 조작이 없다. 서식 기능이 생기면 그 명령에서 확인한다.
 */
export type AllowedActions = readonly AllowedAction[];

const ACTION_REFUSALS: Record<AllowedAction, string> = {
  ENTER_VALUE: '이 문제에서는 값을 직접 입력하거나 지울 수 없습니다.',
  ENTER_FORMULA: '이 문제에서는 수식을 입력할 수 없습니다.',
  COPY_PASTE: '이 문제에서는 복사·붙여넣기와 잘라내기를 쓸 수 없습니다.',
  AUTOFILL: '이 문제에서는 자동 채우기를 쓸 수 없습니다.',
  FORMAT_CELLS: '이 문제에서는 셀 서식을 바꿀 수 없습니다.',
  INSERT_DELETE_ROW_COLUMN: '이 문제에서는 행이나 열을 삽입하거나 삭제할 수 없습니다.',
};

/** 거부할 때 대신 무엇을 하면 되는지 알려 주는 문장. 허용한 작업을 학생 말로 풀어 쓴다. */
function alternativeGuide(allowed: AllowedActions): string {
  const ways: string[] = [];
  if (allowed.includes('AUTOFILL')) ways.push('채우기 핸들을 끌어');
  if (allowed.includes('COPY_PASTE')) ways.push('복사해 붙여넣어');
  if (allowed.includes('ENTER_FORMULA')) ways.push('수식을 입력해');
  if (ways.length === 0) return '';
  return ` 이 문제는 ${ways.join(' 보거나 ')} 보세요.`;
}

const READ_ONLY_MESSAGE = '문제의 원본 데이터 칸이라 수정할 수 없습니다.';
const READ_ONLY_SHEET_MESSAGE = '원본 데이터가 있는 시트라 이름을 바꾸거나 삭제할 수 없습니다.';

/** 범위("A1:D1" 또는 "B3")를 0부터 시작하는 칸 영역으로. 형식이 다르면 null. */
function rectOfRange(range: string): CellRect | null {
  const [first = '', second = first] = range.split(':');
  const a = parseA1(first);
  const b = parseA1(second);
  if (a === null || b === null) return null;
  return {
    startRow: Math.min(a.row, b.row),
    startCol: Math.min(a.col, b.col),
    endRow: Math.max(a.row, b.row),
    endCol: Math.max(a.col, b.col),
  };
}

export class WorkbookModel {
  readonly history = new HistoryManager<WorkbookCommand>();
  private sheets: SheetState[];
  private active: string;
  private readonly readOnly = new Map<string, CellRect[]>();

  private constructor(
    private readonly engine: FormulaEngineAdapter,
    snapshot: WorkbookSnapshot,
    readOnlyRanges: ReadOnlyRanges = {},
    private readonly allowedActions?: AllowedActions,
  ) {
    this.sheets = snapshot.sheets.map(sheetStateFrom);
    this.active = this.pickActive(snapshot.activeSheet);
    for (const [sheet, ranges] of Object.entries(readOnlyRanges)) {
      const rects = ranges.flatMap((range) => rectOfRange(range) ?? []);
      if (rects.length > 0) this.readOnly.set(sheet, rects);
    }
  }

  /** 스냅샷으로 엔진을 준비한다. 스냅샷이 엔진 제한을 넘으면 FormulaEngineInputError. */
  static async create(
    snapshot: WorkbookSnapshot,
    createEngine: () => FormulaEngineAdapter = () => new HyperFormulaAdapter(),
    readOnlyRanges: ReadOnlyRanges = {},
    allowedActions?: AllowedActions,
  ): Promise<WorkbookModel> {
    const problem = checkSnapshot(snapshot);
    if (problem !== null) throw new FormulaEngineInputError(problem);
    const model = new WorkbookModel(createEngine(), snapshot, readOnlyRanges, allowedActions);
    try {
      await model.engine.initWorkbook(
        Object.fromEntries(model.sheets.map((sheet) => [sheet.name, denseRows(sheet.inputs)])),
      );
    } catch (error) {
      // 준비에 실패한 엔진은 아무도 쓰지 않으므로 여기서 정리하고 오류는 그대로 올린다.
      model.destroy();
      throw error;
    }
    return model;
  }

  destroy(): void {
    this.engine.destroy();
  }

  // ---- 읽기 ----

  get sheetNames(): string[] {
    return this.sheets.map((sheet) => sheet.name);
  }

  get activeSheet(): string {
    return this.active;
  }

  getInput(sheet: string, row: number, col: number): string {
    return this.sheet(sheet).inputs.get(keyOf(row, col)) ?? '';
  }

  getResult(sheet: string, row: number, col: number): CellResult {
    if (!this.hasSheet(sheet)) return EMPTY_RESULT;
    return this.engine.getCellValue(sheet, row, col);
  }

  hasSheet(name: string): boolean {
    return this.sheets.some((sheet) => sheet.name === name);
  }

  /** 시트에 값이 하나라도 있는지 */
  sheetHasData(name: string): boolean {
    return this.sheet(name).inputs.size > 0;
  }

  /** 시트의 기본값과 다른 열 너비·행 높이 (화면 배치용) */
  getSizes(sheet: string): {
    columnWidths: ReadonlyMap<number, number>;
    rowHeights: ReadonlyMap<number, number>;
  } {
    const { columnWidths, rowHeights } = this.sheet(sheet);
    return { columnWidths, rowHeights };
  }

  /** 열 너비. 기본값이면 undefined */
  getColumnWidth(sheet: string, col: number): number | undefined {
    return this.sheet(sheet).columnWidths.get(col);
  }

  /** 행 높이. 기본값이면 undefined */
  getRowHeight(sheet: string, row: number): number | undefined {
    return this.sheet(sheet).rowHeights.get(row);
  }

  snapshot(): WorkbookSnapshot {
    return {
      activeSheet: this.active,
      sheets: this.sheets.map(({ name, inputs, columnWidths, rowHeights }) => {
        const cells: Record<string, string> = {};
        for (const [key, raw] of inputs) cells[cellAddress(positionOf(key))] = raw;
        const widths = sizesToRecord(columnWidths, 'col');
        const heights = sizesToRecord(rowHeights, 'row');
        return {
          name,
          cells,
          ...(widths === undefined ? {} : { columnWidths: widths }),
          ...(heights === undefined ? {} : { rowHeights: heights }),
        };
      }),
    };
  }

  // ---- 화면 상태 (실행 취소 대상 아님) ----

  setActiveSheet(name: string): void {
    this.sheet(name);
    this.active = name;
  }

  /** 수정할 수 없는 칸인지 */
  isReadOnly(sheet: string, row: number, col: number): boolean {
    return (this.readOnly.get(sheet) ?? []).some(
      (rect) =>
        row >= rect.startRow && row <= rect.endRow && col >= rect.startCol && col <= rect.endCol,
    );
  }

  private rectTouchesReadOnly(sheet: string, rect: CellRect): boolean {
    return (this.readOnly.get(sheet) ?? []).some(
      (r) =>
        rect.startRow <= r.endRow &&
        r.startRow <= rect.endRow &&
        rect.startCol <= r.endCol &&
        r.startCol <= rect.endCol,
    );
  }

  /** 문제가 허용하지 않은 작업이면 거부 안내 문장, 허용하면 null */
  private actionRefusal(action: AllowedAction): string | null {
    const allowed = this.allowedActions;
    if (allowed === undefined || allowed.includes(action)) return null;
    return `${ACTION_REFUSALS[action]}${alternativeGuide(allowed)}`;
  }

  // ---- 변경 (모두 실행 취소 가능) ----

  /**
   * 사용자가 셀에 직접 입력하거나 지운다. 값이 달라지는 칸이 수식이면 ENTER_FORMULA, 아니면 ENTER_VALUE가
   * 허용돼야 한다. 허용하지 않은 작업이 하나라도 있으면 아무것도 바꾸지 않고 거부한다.
   */
  setCells(sheetName: string, changes: readonly CellChange[], label?: string): string | null {
    return this.writeCells(sheetName, changes, label, () => {
      const sheet = this.sheet(sheetName);
      for (const { row, col, value } of changes) {
        if ((sheet.inputs.get(keyOf(row, col)) ?? '') === value) continue;
        const refusal = this.actionRefusal(value.startsWith('=') ? 'ENTER_FORMULA' : 'ENTER_VALUE');
        if (refusal !== null) return refusal;
      }
      return null;
    });
  }

  /**
   * 셀 원문을 바꾼다(붙여넣기·채우기도 이 길로 쓴다). 값이 달라지는 칸 중 수정 금지 칸이 하나라도 있으면
   * 아무것도 바꾸지 않고 거부한다. 수정 금지 검사 다음에 refuseAction이 안내 문장을 돌려주면 그것도 거부한다
   * (원본 칸을 건드리려 했다면 작업 종류보다 그 안내가 먼저 나온다).
   * 엔진이 받아들이지 않는 변경(수식 길이 상한 등)에서 멈추고 안내 문장을 돌려준다.
   * 그 앞의 변경은 반영되고 하나의 실행 취소 단위로 기록된다.
   */
  private writeCells(
    sheetName: string,
    changes: readonly CellChange[],
    label?: string,
    refuseAction?: () => string | null,
  ): string | null {
    const sheet = this.sheet(sheetName);
    const blocked = changes.some(
      ({ row, col, value }) =>
        this.isReadOnly(sheetName, row, col) && (sheet.inputs.get(keyOf(row, col)) ?? '') !== value,
    );
    if (blocked) return READ_ONLY_MESSAGE;
    const notAllowed = refuseAction?.() ?? null;
    if (notAllowed !== null) return notAllowed;
    const applied: { row: number; col: number; before: string; after: string }[] = [];
    let refusal: string | null = null;
    for (const { row, col, value } of changes) {
      const before = sheet.inputs.get(keyOf(row, col)) ?? '';
      if (before === value) continue;
      try {
        this.writeCell(sheet, row, col, value);
      } catch (error) {
        if (!(error instanceof FormulaEngineInputError)) throw error;
        refusal = error.message;
        break;
      }
      applied.push({ row, col, before, after: value });
    }
    if (applied.length > 0) {
      const first = applied[0];
      const commandLabel =
        label ??
        (applied.length === 1 && first !== undefined
          ? `${cellAddress(first)} ${first.after === '' ? '지우기' : '입력'}`
          : `셀 ${applied.length}개 변경`);
      // 이름 변경은 스냅샷 명령이 되돌리므로, 이 명령이 다시 실행될 때 시트 이름은 지금과 같다.
      const command: WorkbookCommand = {
        label: commandLabel,
        apply: () => {
          const target = this.sheet(sheetName);
          for (const cell of applied) this.writeCell(target, cell.row, cell.col, cell.after);
        },
        revert: () => {
          const target = this.sheet(sheetName);
          for (const cell of [...applied].reverse()) {
            this.writeCell(target, cell.row, cell.col, cell.before);
          }
        },
        sheetAfter: () => sheetName,
        sheetBefore: () => sheetName,
      };
      this.history.record(command);
    }
    return refusal;
  }

  /** 새 시트를 끝에 추가하고 그 시트로 간다. 추가한 이름, 또는 거부 이유를 돌려준다. */
  addSheet(name?: string): { name: string } | { error: string } {
    if (this.sheets.length >= MAX_SHEETS) {
      return { error: `시트는 ${MAX_SHEETS}개까지 만들 수 있습니다.` };
    }
    const sheetName = name ?? this.nextSheetName();
    const problem = validateSheetName(sheetName, this.sheetNames);
    if (problem !== null) return { error: problem };
    this.runStructural('시트 추가', () => {
      this.sheets.push({
        name: sheetName,
        inputs: new Map(),
        columnWidths: new Map(),
        rowHeights: new Map(),
      });
      this.active = sheetName;
      this.rebuildEngine();
    });
    return { name: sheetName };
  }

  /** 시트 이름을 바꾼다. 문제가 있으면 안내 문장, 성공하면 null. */
  renameSheet(oldName: string, newName: string): string | null {
    const sheet = this.sheet(oldName);
    if (oldName === newName) return null;
    if (this.readOnly.has(oldName)) return READ_ONLY_SHEET_MESSAGE;
    const problem = validateSheetName(newName, this.sheetNames, oldName);
    if (problem !== null) return problem;
    this.runStructural('시트 이름 변경', () => {
      const formulasBefore = this.engineFormulas();
      this.engine.renameSheet(oldName, newName);
      sheet.name = newName;
      if (this.active === oldName) this.active = newName;
      // 엔진이 다른 수식 속 시트 이름을 바꿔 썼다면 원문도 그 수식으로 맞춘다.
      for (const target of this.sheets) {
        for (const [key, raw] of target.inputs) {
          if (!raw.startsWith('=')) continue;
          const { row, col } = positionOf(key);
          const before = formulasBefore.get(`${target === sheet ? oldName : target.name}!${key}`);
          const after = this.engine.getCellFormula(target.name, row, col);
          if (after !== null && before !== after) target.inputs.set(key, after);
        }
      }
      this.rebuildEngine();
    });
    return null;
  }

  /** 시트를 삭제한다. 마지막 시트는 지울 수 없다. 실행 취소하면 위치와 내용이 돌아온다. */
  deleteSheet(name: string): string | null {
    this.sheet(name);
    if (this.readOnly.has(name)) return READ_ONLY_SHEET_MESSAGE;
    if (this.sheets.length === 1) return '마지막 시트는 삭제할 수 없습니다.';
    this.runStructural('시트 삭제', () => {
      const index = this.sheets.findIndex((sheet) => sheet.name === name);
      this.sheets.splice(index, 1);
      if (this.active === name) {
        this.active = (this.sheets[Math.max(0, index - 1)] ?? this.sheets[0])?.name ?? '';
      }
      this.rebuildEngine();
    });
    return null;
  }

  /**
   * 통합 문서 전체를 바꾼다(빈 스프레드시트 만들기·파일 불러오기·다시 시작).
   * 이전 내용은 실행 취소로 되돌릴 수 있다(MASTER_PROMPT §9.2). 문제가 있으면 안내 문장.
   */
  replaceWorkbook(snapshot: WorkbookSnapshot, label = '통합 문서 바꾸기'): string | null {
    const problem = checkSnapshot(snapshot);
    if (problem !== null) return problem;
    this.runStructural(label, () => this.applySnapshot(snapshot));
    return null;
  }

  /** 한 시트의 내용을 통째로 바꾼다(샘플 데이터 불러오기). 실행 취소 한 번에 원래대로 돌아온다. */
  replaceSheetCells(
    sheetName: string,
    cells: Readonly<Record<string, string>>,
    label = '시트 내용 바꾸기',
  ): string | null {
    this.sheet(sheetName);
    const current = this.snapshot();
    const next: WorkbookSnapshot = {
      activeSheet: sheetName,
      sheets: current.sheets.map((sheet) =>
        sheet.name === sheetName ? { name: sheet.name, cells } : sheet,
      ),
    };
    return this.replaceWorkbook(next, label);
  }

  /** 시트를 다른 자리로 옮긴다(탭 순서). 참조는 시트 이름으로 하므로 수식은 바뀌지 않는다. */
  moveSheet(name: string, toIndex: number): string | null {
    this.sheet(name);
    const from = this.sheets.findIndex((sheet) => sheet.name === name);
    const to = Math.min(Math.max(toIndex, 0), this.sheets.length - 1);
    if (from === to) return null;
    this.runStructural('시트 이동', () => {
      const [moved] = this.sheets.splice(from, 1);
      if (moved !== undefined) this.sheets.splice(to, 0, moved);
      this.active = name;
      this.rebuildEngine();
    });
    return null;
  }

  // ---- 행·열, 복사·붙여넣기, 자동 채우기 (CARD-02E) ----

  /** 행·열을 삽입하거나 삭제한다. 모든 시트의 수식 참조가 같이 움직인다. 거부되면 안내 문장. */
  changeStructure(change: StructuralChange): string | null {
    // 수정 금지 영역이 지워지거나 밀리지 않도록, 그 영역의 끝 행·열 이하에 영향을 주는 변경은 거부한다.
    const affectsReadOnly = (this.readOnly.get(change.sheet) ?? []).some(
      (rect) => change.index <= (change.axis === 'row' ? rect.endRow : rect.endCol),
    );
    if (affectsReadOnly) return READ_ONLY_MESSAGE;
    const notAllowed = this.actionRefusal('INSERT_DELETE_ROW_COLUMN');
    if (notAllowed !== null) return notAllowed;
    const result = applyStructuralChange(this.snapshot().sheets, change);
    if ('error' in result) return result.error;
    const problem = checkSnapshot({ sheets: result.sheets });
    if (problem !== null) return problem;
    const axis = change.axis === 'row' ? '행' : '열';
    const label = `${axis} ${change.count}개 ${change.kind === 'insert' ? '삽입' : '삭제'}`;
    this.runStructural(label, () =>
      this.applySnapshot({ activeSheet: this.active, sheets: result.sheets }),
    );
    return null;
  }

  /**
   * 열 너비(axis 'col')나 행 높이('row')를 바꾼다. size가 null이면 기본 크기로 되돌린다.
   * 크기만 되돌리는 명령이라 엔진은 그대로다.
   */
  setSizes(
    sheetName: string,
    axis: 'row' | 'col',
    indexes: readonly number[],
    size: number | null,
  ): string | null {
    const sheet = this.sheet(sheetName);
    if (size !== null && !isValidSize(size, axis)) {
      return axis === 'col'
        ? '열 너비가 허용 범위를 벗어났습니다.'
        : '행 높이가 허용 범위를 벗어났습니다.';
    }
    const limit = axis === 'col' ? ENGINE_LIMITS.maxColumns : ENGINE_LIMITS.maxRows;
    const sizesOf = (target: SheetState) =>
      axis === 'col' ? target.columnWidths : target.rowHeights;
    const changes = indexes
      .filter((index) => Number.isInteger(index) && index >= 0 && index < limit)
      .map((index) => ({ index, before: sizesOf(sheet).get(index) ?? null, after: size }))
      .filter((change) => change.before !== change.after);
    if (changes.length === 0) return null;
    const write = (key: 'before' | 'after') => {
      const sizes = sizesOf(this.sheet(sheetName));
      for (const change of changes) {
        const value = change[key];
        if (value === null) sizes.delete(change.index);
        else sizes.set(change.index, value);
      }
    };
    write('after');
    this.history.record({
      label: axis === 'col' ? '열 너비 변경' : '행 높이 변경',
      apply: () => write('after'),
      revert: () => write('before'),
      sheetAfter: () => sheetName,
      sheetBefore: () => sheetName,
    });
    return null;
  }

  /** 붙여넣기. 앱 안에서 복사한 수식은 상대 참조를 옮긴다. 붙여넣은 범위나 거부 이유를 돌려준다. */
  paste(
    sheetName: string,
    source: PasteSource,
    target: CellRect,
  ): { rect: CellRect } | { error: string } {
    this.sheet(sheetName);
    const result = pasteWrites(source, target);
    if ('error' in result) return result;
    const refusal = this.writeCells(sheetName, result.writes, '붙여넣기', () =>
      this.actionRefusal('COPY_PASTE'),
    );
    return refusal === null ? { rect: result.rect } : { error: refusal };
  }

  /** 잘라낸 셀을 옮긴다. 다른 수식이 가리키던 참조도 따라간다. 거부되면 안내 문장. */
  moveCells(move: CellMove): string | null {
    this.sheet(move.fromSheet);
    this.sheet(move.toSheet);
    const destination: CellRect = {
      startRow: move.rect.startRow + move.dRow,
      startCol: move.rect.startCol + move.dCol,
      endRow: move.rect.endRow + move.dRow,
      endCol: move.rect.endCol + move.dCol,
    };
    if (
      this.rectTouchesReadOnly(move.fromSheet, move.rect) ||
      this.rectTouchesReadOnly(move.toSheet, destination)
    ) {
      return READ_ONLY_MESSAGE;
    }
    const notAllowed = this.actionRefusal('COPY_PASTE');
    if (notAllowed !== null) return notAllowed;
    const result = moveSheetCells(this.snapshot().sheets, move);
    if ('error' in result) return result.error;
    const problem = checkSnapshot({ sheets: result.sheets });
    if (problem !== null) return problem;
    this.runStructural('잘라내서 붙여넣기', () =>
      this.applySnapshot({ activeSheet: move.toSheet, sheets: result.sheets }),
    );
    return null;
  }

  /** 채우기 핸들로 source를 direction 방향으로 count칸 채운다. */
  fill(
    sheetName: string,
    source: CellRect,
    direction: FillDirection,
    count: number,
  ): string | null {
    const writes = fillWrites(
      (row, col) => this.getInput(sheetName, row, col),
      source,
      direction,
      count,
    );
    return this.writeCells(sheetName, writes, '자동 채우기', () => this.actionRefusal('AUTOFILL'));
  }

  /** Ctrl+D(아래로)·Ctrl+R(오른쪽으로) 채우기 */
  fillFromEdge(sheetName: string, selection: CellRect, direction: 'down' | 'right'): string | null {
    const writes = copyFillWrites(
      (row, col) => this.getInput(sheetName, row, col),
      selection,
      direction,
    );
    return this.writeCells(
      sheetName,
      writes,
      direction === 'down' ? '아래로 채우기' : '오른쪽으로 채우기',
      () => this.actionRefusal('AUTOFILL'),
    );
  }

  /** 실행 취소. 되돌린 뒤 보여 줄 시트로 옮겨 가고, 되돌린 명령을 돌려준다. */
  undo(): WorkbookCommand | null {
    const command = this.history.undo();
    if (command !== null) this.focus(command.sheetBefore());
    return command;
  }

  redo(): WorkbookCommand | null {
    const command = this.history.redo();
    if (command !== null) this.focus(command.sheetAfter());
    return command;
  }

  // ---- 내부 ----

  private sheet(name: string): SheetState {
    const found = this.sheets.find((sheet) => sheet.name === name);
    if (found === undefined) throw new FormulaEngineInputError(`시트를 찾을 수 없습니다: ${name}`);
    return found;
  }

  private pickActive(name: string | undefined): string {
    if (name !== undefined && this.hasSheet(name)) return name;
    return this.sheets[0]?.name ?? DEFAULT_SHEET;
  }

  private focus(name: string): void {
    this.active = this.pickActive(name);
  }

  private nextSheetName(): string {
    const taken = new Set(this.sheetNames.map((name) => name.toLocaleLowerCase()));
    let n = this.sheets.length + 1;
    while (taken.has(`sheet${n}`)) n += 1;
    return `Sheet${n}`;
  }

  private writeCell(sheet: SheetState, row: number, col: number, value: string): void {
    this.engine.setCellContent(sheet.name, row, col, toEngineContent(value));
    if (value === '') sheet.inputs.delete(keyOf(row, col));
    else sheet.inputs.set(keyOf(row, col), value);
  }

  /** 모든 수식 셀의 엔진 수식 (키: 시트!행:열) */
  private engineFormulas(): Map<string, string | null> {
    const formulas = new Map<string, string | null>();
    for (const sheet of this.sheets) {
      for (const [key, raw] of sheet.inputs) {
        if (!raw.startsWith('=')) continue;
        const { row, col } = positionOf(key);
        formulas.set(`${sheet.name}!${key}`, this.engine.getCellFormula(sheet.name, row, col));
      }
    }
    return formulas;
  }

  /** 구조 변경을 실행하고, 전후 스냅샷으로 되돌리고 다시 실행하는 명령을 기록한다. */
  private runStructural(label: string, mutate: () => void): void {
    const before = this.snapshot();
    mutate();
    const after = this.snapshot();
    this.history.record({
      label,
      apply: () => this.applySnapshot(after),
      revert: () => this.applySnapshot(before),
      sheetAfter: () => after.activeSheet ?? DEFAULT_SHEET,
      sheetBefore: () => before.activeSheet ?? DEFAULT_SHEET,
    });
  }

  /** 엔진과 원문을 스냅샷과 같게 만든다. 시트 순서는 스냅샷을 따른다. */
  private applySnapshot(snapshot: WorkbookSnapshot): void {
    this.sheets = snapshot.sheets.map(sheetStateFrom);
    this.active = this.pickActive(snapshot.activeSheet);
    this.rebuildEngine();
  }

  /** 원문에서 엔진을 다시 만든다. 지운 시트를 가리키던 수식은 #REF!, 같은 이름 시트가 다시 생기면 다시 연결된다. */
  private rebuildEngine(): void {
    this.engine.loadSheets(
      Object.fromEntries(this.sheets.map((sheet) => [sheet.name, denseRows(sheet.inputs)])),
    );
  }
}

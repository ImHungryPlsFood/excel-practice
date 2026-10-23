import { ENGINE_LIMITS } from '../FormulaEngineAdapter';

/*
 * 수식 참조 이동 공통 로직 (CARD-02E, R-08.06, R-08.07, R-08.10, R-08.17).
 *
 * 수식 글자를 토큰 단위로 읽어 참조 토큰(셀 A1, 범위 A1:B5, 열 범위 A:C, 행 범위 1:3, 시트 접두 Sheet2!·'My Data'!·자료!)의
 * 위치를 찾고, 바뀌는 참조 토큰 구간만 다시 쓴다. 나머지 글자(공백·함수 이름 대소문자·문자열)는 원문 그대로다.
 * 정규식 하나로 바꾸면 문자열("A1"), 시트 이름('A1 시트'!B2), 함수 이름(LOG10)까지 바뀌므로 쓰지 않는다
 * (formulaPreprocess.ts·formulaReference.ts와 같은 방식). 정규식은 토큰 하나의 모양 검사에만 쓴다.
 *
 * 변환 세 가지(Excel 규칙):
 *   - shiftFormulaForCopy: 복사·붙여넣기·자동 채우기. $가 없는 행·열만 옮긴다. 시트 밖으로 나가면 #REF!.
 *   - adjustFormulaForStructure: 행·열 삽입·삭제. 그 시트를 가리키는 참조는 $와 관계없이 옮긴다.
 *     삽입이 범위 안이면 범위가 늘고, 삭제가 범위 일부면 줄고, 전부 지워지면 #REF!.
 *   - adjustFormulaForMove: 잘라내기·붙여넣기. 옮긴 영역을 가리키던 참조는 새 위치로, 덮어쓴 셀을 가리키던 참조는 #REF!.
 *
 * #REF!는 시트 이름 없이 쓴다. HyperFormula 3.5.0은 Sheet2!#REF!를 구문 오류(#ERROR!)로 읽는다
 * (docs/EXCEL_DIFFERENCES.md "다음 골든 라운드 확인 목록").
 */

/** Excel 최대 열(XFD)과 행. 참조 모양 판정에 쓴다. */
export const EXCEL_MAX_COLUMNS = 16_384;
export const EXCEL_MAX_ROWS = 1_048_576;

export const REF_ERROR = '#REF!';

/** 참조를 옮길 수 있는 시트 크기. 이 밖으로 나가면 #REF!. */
export interface SheetBounds {
  maxRows: number;
  maxColumns: number;
}

const ENGINE_BOUNDS: SheetBounds = {
  maxRows: ENGINE_LIMITS.maxRows,
  maxColumns: ENGINE_LIMITS.maxColumns,
};

/** 행 또는 열 하나 (0부터) */
export interface AxisPart {
  index: number;
  absolute: boolean;
}

/** 참조 끝점. 셀은 열·행 모두, 열 범위 끝점은 열만, 행 범위 끝점은 행만 있다. */
export interface Endpoint {
  col: AxisPart | null;
  row: AxisPart | null;
  /** 수식 글자 안 위치 [start, end) */
  start: number;
  end: number;
}

export type ReferenceKind = 'cell' | 'range' | 'columns' | 'rows';

export interface ReferenceToken {
  /** 시트 접두를 포함한 토큰 위치 [start, end) */
  start: number;
  end: number;
  /** 시트 접두 원문('!' 포함). 없으면 빈 문자열 */
  prefix: string;
  /** 따옴표를 푼 시트 이름. 접두가 없으면 null(수식이 있는 시트) */
  sheet: string | null;
  kind: ReferenceKind;
  first: Endpoint;
  /** 범위의 두 번째 끝점. 셀이면 null */
  second: Endpoint | null;
}

// ---- 셀 참조 한 토큰 (F4·이름 상자도 쓴다) ----

export interface CellReferenceParts {
  colAbsolute: boolean;
  column: string;
  rowAbsolute: boolean;
  row: number;
}

const CELL_SHAPE = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/;
const COLUMN_SHAPE = /^(\$?)([A-Za-z]{1,3})$/;
const ROW_SHAPE = /^(\$?)(\d+)$/;

/** 열 문자를 1부터 시작하는 번호로 (A → 1) */
export function columnNumber(letters: string): number {
  return [...letters.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

/** 0부터 시작하는 열 번호를 문자로 (0 → A, 26 → AA) */
export function columnLetters(col: number): string {
  let label = '';
  for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  }
  return label;
}

const validRowText = (text: string, row: number) =>
  row >= 1 && row <= EXCEL_MAX_ROWS && !text.startsWith('0');

/** 토큰이 셀 참조(A1, $B$2 등)면 구성 요소, 아니면 null */
export function parseCellReference(token: string): CellReferenceParts | null {
  const match = CELL_SHAPE.exec(token);
  if (!match) return null;
  const [, colMark = '', column = '', rowMark = '', rowText = ''] = match;
  const row = Number(rowText);
  if (columnNumber(column) > EXCEL_MAX_COLUMNS || !validRowText(rowText, row)) return null;
  return { colAbsolute: colMark === '$', column, rowAbsolute: rowMark === '$', row };
}

export function formatCellReference(parts: CellReferenceParts): string {
  return `${parts.colAbsolute ? '$' : ''}${parts.column}${parts.rowAbsolute ? '$' : ''}${parts.row}`;
}

function parseColumnPart(word: string): AxisPart | null {
  const match = COLUMN_SHAPE.exec(word);
  if (!match) return null;
  const [, mark = '', letters = ''] = match;
  const number = columnNumber(letters);
  return number > EXCEL_MAX_COLUMNS ? null : { index: number - 1, absolute: mark === '$' };
}

function parseRowPart(word: string): AxisPart | null {
  const match = ROW_SHAPE.exec(word);
  if (!match) return null;
  const [, mark = '', digits = ''] = match;
  const row = Number(digits);
  return validRowText(digits, row) ? { index: row - 1, absolute: mark === '$' } : null;
}

function parseCellPart(word: string): { col: AxisPart; row: AxisPart } | null {
  const parts = parseCellReference(word);
  if (parts === null) return null;
  return {
    col: { index: columnNumber(parts.column) - 1, absolute: parts.colAbsolute },
    row: { index: parts.row - 1, absolute: parts.rowAbsolute },
  };
}

// ---- 토큰 읽기 ----

/** 식별자·숫자 덩어리 글자: 문자(한글 포함)·숫자·_·.·$ */
function isWordChar(ch: string): boolean {
  return ch !== '' && /[\p{L}\p{N}_.$]/u.test(ch);
}

function readWord(text: string, start: number): number {
  let end = start;
  while (end < text.length && isWordChar(text.charAt(end))) end += 1;
  return end;
}

/** 따옴표로 시작하는 위치에서 닫는 따옴표 다음 위치까지. 두 번 겹친 따옴표는 글자다. 닫히지 않으면 끝까지. */
export function skipQuoted(text: string, start: number): number {
  const quote = text.charAt(start);
  let i = start + 1;
  while (i < text.length) {
    if (text.charAt(i) === quote) {
      if (text.charAt(i + 1) === quote) {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i += 1;
  }
  return text.length;
}

function nextNonSpace(text: string, from: number): string {
  let i = from;
  while (text.charAt(i) === ' ') i += 1;
  return text.charAt(i);
}

/** 단어 뒤가 함수 호출('(')이나 시트 이름('!')이면 참조가 아니다. */
function endsReference(text: string, wordEnd: number): boolean {
  return text.charAt(wordEnd) !== '!' && nextNonSpace(text, wordEnd) !== '(';
}

type ReferenceBody = Pick<ReferenceToken, 'kind' | 'first' | 'second' | 'end'>;

/** position에서 시작하는 참조 본체(시트 접두 뒤)를 읽는다. 참조가 아니면 null. */
function readReferenceBody(text: string, position: number): ReferenceBody | null {
  const firstEnd = readWord(text, position);
  if (firstEnd === position || !endsReference(text, firstEnd)) return null;
  const firstWord = text.slice(position, firstEnd);
  const cell = parseCellPart(firstWord);

  if (text.charAt(firstEnd) === ':') {
    const secondStart = firstEnd + 1;
    const secondEnd = readWord(text, secondStart);
    const secondWord = text.slice(secondStart, secondEnd);
    if (secondEnd > secondStart && endsReference(text, secondEnd)) {
      const firstSpan = { start: position, end: firstEnd };
      const secondSpan = { start: secondStart, end: secondEnd };
      const otherCell = parseCellPart(secondWord);
      if (cell !== null && otherCell !== null) {
        return {
          kind: 'range',
          first: { ...cell, ...firstSpan },
          second: { ...otherCell, ...secondSpan },
          end: secondEnd,
        };
      }
      const colA = parseColumnPart(firstWord);
      const colB = parseColumnPart(secondWord);
      if (colA !== null && colB !== null) {
        return {
          kind: 'columns',
          first: { col: colA, row: null, ...firstSpan },
          second: { col: colB, row: null, ...secondSpan },
          end: secondEnd,
        };
      }
      const rowA = parseRowPart(firstWord);
      const rowB = parseRowPart(secondWord);
      if (rowA !== null && rowB !== null) {
        return {
          kind: 'rows',
          first: { col: null, row: rowA, ...firstSpan },
          second: { col: null, row: rowB, ...secondSpan },
          end: secondEnd,
        };
      }
    }
  }
  if (cell === null) return null;
  return {
    kind: 'cell',
    first: { ...cell, start: position, end: firstEnd },
    second: null,
    end: firstEnd,
  };
}

/** 작은따옴표 시트 이름을 푼다('My ''Data''' → My 'Data') */
function unquoteSheetName(quoted: string): string {
  const inner = quoted.endsWith("'") && quoted.length >= 2 ? quoted.slice(1, -1) : quoted.slice(1);
  let name = '';
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner.charAt(i);
    name += ch;
    if (ch === "'" && inner.charAt(i + 1) === "'") i += 1;
  }
  return name;
}

/**
 * 수식('='로 시작)의 참조 토큰을 왼쪽부터 모은다. 수식이 아니면 빈 배열.
 * 큰따옴표 문자열 안, 함수 이름(뒤에 '('), 이름 정의·TRUE 같은 단어는 참조가 아니다.
 */
export function scanReferences(formula: string): ReferenceToken[] {
  if (!formula.startsWith('=')) return [];
  const tokens: ReferenceToken[] = [];
  let i = 1;
  while (i < formula.length) {
    const ch = formula.charAt(i);
    if (ch === '"') {
      i = skipQuoted(formula, i);
    } else if (ch === "'") {
      const nameEnd = skipQuoted(formula, i);
      if (formula.charAt(nameEnd) === '!') {
        const body = readReferenceBody(formula, nameEnd + 1);
        if (body !== null) {
          const prefix = formula.slice(i, nameEnd + 1);
          tokens.push({ start: i, prefix, sheet: unquoteSheetName(prefix.slice(0, -1)), ...body });
          i = body.end;
          continue;
        }
        i = nameEnd + 1;
      } else {
        i = nameEnd;
      }
    } else if (isWordChar(ch)) {
      const wordEnd = readWord(formula, i);
      if (formula.charAt(wordEnd) === '!') {
        const body = readReferenceBody(formula, wordEnd + 1);
        if (body !== null) {
          const prefix = formula.slice(i, wordEnd + 1);
          tokens.push({ start: i, prefix, sheet: prefix.slice(0, -1), ...body });
          i = body.end;
          continue;
        }
        i = wordEnd + 1;
        continue;
      }
      const body = readReferenceBody(formula, i);
      if (body !== null) {
        tokens.push({ start: i, prefix: '', sheet: null, ...body });
        i = body.end;
      } else {
        i = wordEnd;
      }
    } else {
      i += 1;
    }
  }
  return tokens;
}

// ---- 쓰기 ----

function formatAxis(part: AxisPart | null, kind: 'col' | 'row'): string {
  if (part === null) return '';
  const label = kind === 'col' ? columnLetters(part.index) : String(part.index + 1);
  return `${part.absolute ? '$' : ''}${label}`;
}

export function formatEndpoint(endpoint: Pick<Endpoint, 'col' | 'row'>): string {
  return formatAxis(endpoint.col, 'col') + formatAxis(endpoint.row, 'row');
}

/** 따옴표 없이 쓸 수 있는 시트 이름: 문자·_로 시작, 문자·숫자·_·.만, 셀·열·행 참조처럼 보이지 않음 */
function sheetNameNeedsQuotes(name: string): boolean {
  if (!/^[\p{L}_][\p{L}\p{N}_.]*$/u.test(name)) return true;
  return (
    parseCellReference(name) !== null ||
    parseColumnPart(name) !== null ||
    /^[Rr]\d*[Cc]\d*$/.test(name)
  );
}

/** 시트 접두('!' 포함). 공백·특수문자가 있으면 작은따옴표로 감싸고 안의 작은따옴표는 두 번 쓴다. */
export function formatSheetPrefix(name: string): string {
  if (!sheetNameNeedsQuotes(name)) return `${name}!`;
  let escaped = '';
  for (const ch of name) escaped += ch === "'" ? "''" : ch;
  return `'${escaped}'!`;
}

const sameSheet = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

type Rewrite = (token: ReferenceToken) => string | null;

/** 토큰마다 새 글자(바꾸지 않으면 null)를 받아 그 구간만 바꾼다. */
function rewriteReferences(formula: string, rewrite: Rewrite): string {
  const tokens = scanReferences(formula);
  let out = '';
  let cursor = 0;
  for (const token of tokens) {
    const replacement = rewrite(token);
    if (replacement === null) continue;
    out += formula.slice(cursor, token.start) + replacement;
    cursor = token.end;
  }
  return cursor === 0 ? formula : out + formula.slice(cursor);
}

function formatBody(
  first: Pick<Endpoint, 'col' | 'row'>,
  second: Pick<Endpoint, 'col' | 'row'> | null,
) {
  return second === null
    ? formatEndpoint(first)
    : `${formatEndpoint(first)}:${formatEndpoint(second)}`;
}

// ---- 복사·붙여넣기·자동 채우기 ----

function shiftPart(part: AxisPart | null, delta: number, limit: number): AxisPart | null | 'out' {
  if (part === null || part.absolute || delta === 0) return part;
  const index = part.index + delta;
  return index < 0 || index >= limit ? 'out' : { ...part, index };
}

/**
 * 수식을 (dRow, dCol)만큼 떨어진 셀로 복사할 때의 수식. $가 없는 행·열만 옮긴다.
 * 옮긴 참조가 시트 밖이면 그 참조 전체를 #REF!로 바꾼다. 다른 시트 참조도 같은 규칙이다.
 */
export function shiftFormulaForCopy(
  formula: string,
  dRow: number,
  dCol: number,
  bounds: SheetBounds = ENGINE_BOUNDS,
): string {
  if (dRow === 0 && dCol === 0) return formula;
  return rewriteReferences(formula, (token) => {
    const endpoints = token.second === null ? [token.first] : [token.first, token.second];
    const moved: Pick<Endpoint, 'col' | 'row'>[] = [];
    let changed = false;
    for (const endpoint of endpoints) {
      const col = shiftPart(endpoint.col, dCol, bounds.maxColumns);
      const row = shiftPart(endpoint.row, dRow, bounds.maxRows);
      if (col === 'out' || row === 'out') return REF_ERROR;
      if (col !== endpoint.col || row !== endpoint.row) changed = true;
      moved.push({ col, row });
    }
    if (!changed) return null;
    const [first, second = null] = moved;
    return first === undefined ? null : token.prefix + formatBody(first, second);
  });
}

// ---- 행·열 삽입·삭제 ----

export interface StructuralChange {
  /** 행·열을 넣거나 지운 시트 */
  sheet: string;
  axis: 'row' | 'col';
  kind: 'insert' | 'delete';
  /** 0부터 시작하는 첫 행·열 */
  index: number;
  count: number;
}

const axisOf = (endpoint: Pick<Endpoint, 'col' | 'row'>, axis: 'row' | 'col') =>
  axis === 'row' ? endpoint.row : endpoint.col;

const withAxis = (
  endpoint: Pick<Endpoint, 'col' | 'row'>,
  axis: 'row' | 'col',
  part: AxisPart,
): Pick<Endpoint, 'col' | 'row'> =>
  axis === 'row' ? { col: endpoint.col, row: part } : { col: part, row: endpoint.row };

/** 단일 위치. 지워지면 null. */
function moveIndexForStructure(index: number, change: StructuralChange): number | null {
  const { kind, index: at, count } = change;
  if (kind === 'insert') return index >= at ? index + count : index;
  if (index < at) return index;
  if (index < at + count) return null;
  return index - count;
}

/** 범위 [lo, hi]. 전부 지워지면 null. */
function moveSpanForStructure(
  lo: number,
  hi: number,
  change: StructuralChange,
  limit: number,
): { lo: number; hi: number } | null {
  const { kind, index: at, count } = change;
  if (kind === 'insert') {
    const nextLo = lo >= at ? lo + count : lo;
    if (nextLo >= limit) return null;
    // 범위 끝이 시트 밖으로 밀리면 시트 끝까지로 줄인다(맨 끝 행·열이 빈 경우에만 삽입이 허용된다).
    return { lo: nextLo, hi: Math.min(hi >= at ? hi + count : hi, limit - 1) };
  }
  const last = at + count - 1;
  const nextLo = lo < at ? lo : lo > last ? lo - count : at;
  const nextHi = hi < at ? hi : hi > last ? hi - count : at - 1;
  return nextHi < nextLo ? null : { lo: nextLo, hi: nextHi };
}

/**
 * 행·열 삽입·삭제 뒤의 수식. formulaSheet는 이 수식이 있는 시트(접두 없는 참조의 시트)다.
 * 바뀐 시트를 가리키는 참조만 옮기며 $ 고정과 관계없이 옮긴다(Excel). 지워진 셀만 가리키면 #REF!.
 */
export function adjustFormulaForStructure(
  formula: string,
  formulaSheet: string,
  change: StructuralChange,
  bounds: SheetBounds = ENGINE_BOUNDS,
): string {
  const limit = change.axis === 'row' ? bounds.maxRows : bounds.maxColumns;
  return rewriteReferences(formula, (token) => {
    if (!sameSheet(token.sheet ?? formulaSheet, change.sheet)) return null;
    const { axis } = change;
    const firstPart = axisOf(token.first, axis);
    if (firstPart === null) return null; // 행 삽입은 열 범위(A:C)에, 열 삽입은 행 범위(1:3)에 영향이 없다
    if (token.second === null) {
      const index = moveIndexForStructure(firstPart.index, change);
      if (index === null || index >= limit) return REF_ERROR;
      if (index === firstPart.index) return null;
      return token.prefix + formatEndpoint(withAxis(token.first, axis, { ...firstPart, index }));
    }
    const secondPart = axisOf(token.second, axis);
    if (secondPart === null) return null;
    // 끝점 순서가 거꾸로 적힌 범위(B5:B2)도 작은 쪽·큰 쪽으로 계산하고, 각 끝점의 $ 고정은 그대로 둔다.
    const firstIsLo = firstPart.index <= secondPart.index;
    const lo = firstIsLo ? firstPart : secondPart;
    const hi = firstIsLo ? secondPart : firstPart;
    const span = moveSpanForStructure(lo.index, hi.index, change, limit);
    if (span === null) return REF_ERROR;
    if (span.lo === lo.index && span.hi === hi.index) return null;
    const nextFirst = { ...firstPart, index: firstIsLo ? span.lo : span.hi };
    const nextSecond = { ...secondPart, index: firstIsLo ? span.hi : span.lo };
    return (
      token.prefix +
      formatBody(withAxis(token.first, axis, nextFirst), withAxis(token.second, axis, nextSecond))
    );
  });
}

// ---- 잘라내기·붙여넣기 ----

export interface CellRect {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface CellMove {
  /** 잘라낸 시트와 영역 */
  fromSheet: string;
  rect: CellRect;
  /** 붙여넣은 시트와 이동 거리 */
  toSheet: string;
  dRow: number;
  dCol: number;
}

const inRect = (rect: CellRect, row: number, col: number) =>
  row >= rect.startRow && row <= rect.endRow && col >= rect.startCol && col <= rect.endCol;

export const destinationRect = (move: CellMove): CellRect => ({
  startRow: move.rect.startRow + move.dRow,
  startCol: move.rect.startCol + move.dCol,
  endRow: move.rect.endRow + move.dRow,
  endCol: move.rect.endCol + move.dCol,
});

/**
 * 잘라내기·붙여넣기 뒤의 수식.
 * - 옮긴 영역 안을 가리키던 셀 참조, 전체가 영역 안인 범위 참조 → 새 위치(필요하면 시트 접두를 붙인다)
 * - 덮어쓴 목적지 셀을 가리키던 셀 참조 → #REF!
 * - 수식 자체가 다른 시트로 옮겨졌으면(formulaSheetAfter) 접두 없던 참조에 원래 시트 이름을 붙인다.
 * 범위가 영역에 일부만 걸치면 그대로 둔다(Excel 실측 전, "다음 골든 라운드 확인 목록").
 */
export function adjustFormulaForMove(
  formula: string,
  formulaSheetBefore: string,
  formulaSheetAfter: string,
  move: CellMove,
): string {
  const destination = destinationRect(move);
  const formulaMoved = !sameSheet(formulaSheetBefore, formulaSheetAfter);
  return rewriteReferences(formula, (token) => {
    const target = token.sheet ?? formulaSheetBefore;
    const fromHere = sameSheet(target, move.fromSheet);
    const endpoints = token.second === null ? [token.first] : [token.first, token.second];
    const cellEndpoints = token.kind === 'cell' || token.kind === 'range';
    const insideSource =
      cellEndpoints &&
      fromHere &&
      endpoints.every((e) => inRect(move.rect, e.row?.index ?? -1, e.col?.index ?? -1));

    if (
      !insideSource &&
      token.kind === 'cell' &&
      sameSheet(target, move.toSheet) &&
      inRect(destination, token.first.row?.index ?? -1, token.first.col?.index ?? -1)
    ) {
      return REF_ERROR;
    }
    if (!insideSource && !formulaMoved) return null;

    const nextSheet = insideSource ? move.toSheet : target;
    const moved = insideSource
      ? endpoints.map((e) => ({
          col: e.col === null ? null : { ...e.col, index: e.col.index + move.dCol },
          row: e.row === null ? null : { ...e.row, index: e.row.index + move.dRow },
        }))
      : endpoints;
    const prefix =
      token.prefix !== '' && sameSheet(nextSheet, target)
        ? token.prefix
        : sameSheet(nextSheet, formulaSheetAfter)
          ? ''
          : formatSheetPrefix(nextSheet);
    const [first, second = null] = moved;
    if (first === undefined) return null;
    const rewritten = prefix + formatBody(first, second);
    return rewritten === formula.slice(token.start, token.end) ? null : rewritten;
  });
}

// ---- A1 주소 ↔ 위치 (셀 원문 저장 키) ----

/** A1 주소를 0부터 시작하는 위치로. $가 붙었거나 형식이 다르면 null. */
export function positionOfAddress(address: string): { row: number; col: number } | null {
  const parts = parseCellReference(address);
  if (parts === null || parts.colAbsolute || parts.rowAbsolute) return null;
  return { row: parts.row - 1, col: columnNumber(parts.column) - 1 };
}

export const addressOf = (row: number, col: number): string => `${columnLetters(col)}${row + 1}`;

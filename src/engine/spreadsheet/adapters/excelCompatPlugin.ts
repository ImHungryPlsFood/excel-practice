/*
 * HyperFormula에 없거나 Excel과 결과가 다른 함수를 Excel 동작에 맞춰 구현한 플러그인 (CARD-02B).
 * 골든 대조(docs/EXCEL_DIFFERENCES.md)에서 드러난 차이를 고친다.
 *   - CONCAT: HyperFormula 3.5.0에 없다(D-1). Excel 2019+ 함수.
 *   - INDEX: 범위 밖 번호에 #NUM!이 아니라 #REF!(D-2). 여러 열 범위에 행 번호만 주면 #REF!(웹 Excel 관찰값).
 *   - INT: 음수를 0 쪽으로 자르지 않고 내림한다(INT(-1.5) = -2).
 *   - ROUND·ROUNDUP·ROUNDDOWN: 십진수 기준 반올림, 자릿수는 정수로 버림(excelFormat.ts).
 *   - EDATE: 윤년 2월 29일을 지킨다.
 *   - DATEDIF: 단위 대소문자 무시.
 *   - MATCH: 정확히 일치(0)에서 *, ? 와일드카드.
 *   - CONCATENATE·TEXTJOIN·LEN: 숫자를 문자열로 바꿀 때 유효 숫자 15자리 규칙(D-6).
 *   - TEXT: 지원하는 서식만 정확히 처리하고 나머지는 #VALUE!(excelFormat.ts).
 * Excel 동작 근거: Microsoft 지원 문서와 docs/EXCEL_DIFFERENCES.md의 2차 골든 대조.
 */

import {
  CellError,
  EmptyValue,
  ErrorType,
  FunctionArgumentType,
  FunctionPlugin,
  HyperFormula,
  SimpleRangeValue,
} from 'hyperformula';

import { roundDecimal, formatTextValue } from '../excelFormat';
import { formatGeneralNumber } from '../numberFormat';

/** Excel 셀 하나에 담을 수 있는 최대 글자 수. 넘으면 CONCAT·TEXTJOIN은 #VALUE!. */
export const EXCEL_MAX_CELL_TEXT = 32_767;

// HyperFormula 내부 형식(ProcedureAst, InterpreterState)은 패키지 밖으로 공개되지 않아 runFunction의 매개변수에서 꺼낸다.
type RunFunction = ExcelCompatPlugin['runFunction'];
type FunctionAst = { args: Parameters<RunFunction>[0] };
type InterpreterState = Parameters<RunFunction>[1];

// EDATE 결과를 날짜로 표시하게 하는 원래 메타데이터. 플러그인 등록으로 덮어쓰기 전에 읽어 둔다.
const EDATE_RETURN_TYPE =
  HyperFormula.getFunctionPlugin('EDATE')?.implementedFunctions['EDATE']?.returnNumberType;

/** 날짜·백분율 같은 서식 숫자는 HyperFormula 내부에서 객체({ val })로 전달된다. */
function rawNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'val' in value &&
    typeof value.val === 'number'
  ) {
    return value.val;
  }
  return null;
}

/** 인수 하나를 Excel 규칙으로 문자열로. 빈 셀은 빈 문자열, 논리값은 TRUE/FALSE, 숫자는 일반 서식(15자리). */
function textPiece(value: unknown): string | CellError {
  if (value instanceof CellError) {
    return value;
  }
  if (value === EmptyValue) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  const number = rawNumber(value);
  if (number !== null) {
    return formatGeneralNumber(number);
  }
  return new CellError(ErrorType.VALUE, '인수를 문자열로 바꿀 수 없습니다.');
}

/** 범위는 행 우선으로 펼친 값 목록, 단일 값은 그대로 한 개짜리 목록. */
function flatten(value: unknown): unknown[] {
  return value instanceof SimpleRangeValue ? value.valuesFromTopLeftCorner() : [value];
}

/** MATCH 와일드카드(*, ?, ~로 이스케이프)를 전체 일치 정규식으로. */
function wildcardPattern(pattern: string): RegExp {
  let source = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern.charAt(i);
    if (ch === '~' && i + 1 < pattern.length) {
      i += 1;
      source += pattern.charAt(i).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } else if (ch === '*') {
      source += '[\\s\\S]*';
    } else if (ch === '?') {
      source += '[\\s\\S]';
    } else {
      source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`, 'i');
}

/** 같은 종류끼리만 비교한다. 종류가 다르면 null. 문자열은 대소문자를 구분하지 않는다. */
function compareScalars(a: unknown, b: unknown): number | null {
  const x = rawNumber(a);
  const y = rawNumber(b);
  if (x !== null && y !== null) {
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  return null;
}

/** FILTER 조건 값 하나를 참/거짓으로. 문자는 Excel처럼 #VALUE!. */
function includeFlag(value: unknown): boolean | CellError {
  if (value instanceof CellError) {
    return value;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const number = rawNumber(value);
  if (number !== null) {
    return number !== 0;
  }
  if (value === EmptyValue) {
    return false;
  }
  return new CellError(ErrorType.VALUE, 'FILTER 조건에 참·거짓이나 숫자가 아닌 값이 있습니다.');
}

export class ExcelCompatPlugin extends FunctionPlugin {
  static override implementedFunctions = {
    CONCAT: {
      method: 'concat',
      // 범위는 낱개 값으로 펼쳐 받는다(행 우선 순서). 인수는 1~253개.
      parameters: [{ argumentType: FunctionArgumentType.ANY }],
      repeatLastArgs: 1,
      expandRanges: true,
    },
    CONCATENATE: {
      method: 'concatenate',
      parameters: [{ argumentType: FunctionArgumentType.ANY }],
      repeatLastArgs: 1,
      expandRanges: true,
    },
    TEXTJOIN: {
      method: 'textjoin',
      repeatLastArgs: 1,
      parameters: [
        { argumentType: FunctionArgumentType.ANY },
        { argumentType: FunctionArgumentType.BOOLEAN },
        { argumentType: FunctionArgumentType.ANY },
      ],
    },
    LEN: {
      method: 'len',
      parameters: [{ argumentType: FunctionArgumentType.ANY }],
    },
    INDEX: {
      method: 'index',
      parameters: [
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.NUMBER },
        { argumentType: FunctionArgumentType.NUMBER, optionalArg: true },
      ],
    },
    MATCH: {
      method: 'match',
      parameters: [
        { argumentType: FunctionArgumentType.NOERROR },
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.NUMBER, defaultValue: 1 },
      ],
    },
    INT: {
      method: 'int',
      parameters: [{ argumentType: FunctionArgumentType.NUMBER }],
    },
    ROUND: {
      method: 'round',
      parameters: [
        { argumentType: FunctionArgumentType.NUMBER },
        { argumentType: FunctionArgumentType.NUMBER, defaultValue: 0 },
      ],
    },
    ROUNDUP: {
      method: 'roundup',
      parameters: [
        { argumentType: FunctionArgumentType.NUMBER },
        { argumentType: FunctionArgumentType.NUMBER, defaultValue: 0 },
      ],
    },
    ROUNDDOWN: {
      method: 'rounddown',
      parameters: [
        { argumentType: FunctionArgumentType.NUMBER },
        { argumentType: FunctionArgumentType.NUMBER, defaultValue: 0 },
      ],
    },
    EDATE: {
      method: 'edate',
      parameters: [
        { argumentType: FunctionArgumentType.NUMBER, minValue: 0 },
        { argumentType: FunctionArgumentType.NUMBER },
      ],
      ...(EDATE_RETURN_TYPE === undefined ? {} : { returnNumberType: EDATE_RETURN_TYPE }),
    },
    DATEDIF: {
      method: 'datedif',
      parameters: [
        { argumentType: FunctionArgumentType.NUMBER, minValue: 0 },
        { argumentType: FunctionArgumentType.NUMBER, minValue: 0 },
        { argumentType: FunctionArgumentType.STRING },
      ],
    },
    TEXT: {
      method: 'text',
      parameters: [
        { argumentType: FunctionArgumentType.NUMBER },
        { argumentType: FunctionArgumentType.STRING },
      ],
    },
  };

  /** 인수들을 이어 붙인다. 오류는 앞의 것을 그대로 돌려주고, 32,767자를 넘으면 #VALUE!. */
  private joinPieces(values: unknown[]): string | CellError {
    let text = '';
    for (const value of values) {
      const piece = textPiece(value);
      if (piece instanceof CellError) {
        return piece;
      }
      text += piece;
    }
    if (text.length > EXCEL_MAX_CELL_TEXT) {
      return new CellError(ErrorType.VALUE, `결과가 ${EXCEL_MAX_CELL_TEXT}자를 넘습니다.`);
    }
    return text;
  }

  concat(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(ast.args, state, this.metadata('CONCAT'), (...values: unknown[]) =>
      this.joinPieces(values),
    );
  }

  concatenate(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(ast.args, state, this.metadata('CONCATENATE'), (...values: unknown[]) =>
      this.joinPieces(values),
    );
  }

  textjoin(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('TEXTJOIN'),
      (delimiterArg: unknown, ignoreEmpty: boolean, ...textArgs: unknown[]) => {
        const delimiters: string[] = [];
        for (const value of flatten(delimiterArg)) {
          const piece = textPiece(value);
          if (piece instanceof CellError) {
            return piece;
          }
          delimiters.push(piece);
        }
        const texts: string[] = [];
        for (const value of textArgs.flatMap(flatten)) {
          const piece = textPiece(value);
          if (piece instanceof CellError) {
            return piece;
          }
          texts.push(piece);
        }
        const parts = ignoreEmpty ? texts.filter((t) => t !== '') : texts;
        const result = parts.reduce(
          (acc, part, i) =>
            i === 0 ? part : acc + (delimiters[(i - 1) % delimiters.length] ?? '') + part,
          '',
        );
        if (result.length > EXCEL_MAX_CELL_TEXT) {
          return new CellError(ErrorType.VALUE, `결과가 ${EXCEL_MAX_CELL_TEXT}자를 넘습니다.`);
        }
        return result;
      },
    );
  }

  len(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(ast.args, state, this.metadata('LEN'), (value: unknown) => {
      const piece = textPiece(value);
      return piece instanceof CellError ? piece : piece.length;
    });
  }

  index(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('INDEX'),
      (range: SimpleRangeValue, rowArg: number, colArg?: number) => {
        // 한 행짜리 범위에 번호를 하나만 주면 Excel은 그 번호를 열 번호로 쓴다.
        let row = rowArg;
        let col = colArg ?? 1;
        if (colArg === undefined && range.height() === 1 && range.width() > 1) {
          row = 1;
          col = rowArg;
        } else if (colArg === undefined && range.height() > 1 && range.width() > 1) {
          // 여러 행·열 범위에 번호 하나: 웹 Excel(골든 2차)은 #REF!를 돌려준다.
          return new CellError(ErrorType.REF, 'INDEX 열 번호를 지정해야 합니다.');
        }
        // 0(행·열 전체 반환)은 배열 결과가 필요해 지원하지 않는다. 음수와 함께 #VALUE!로 알린다.
        if (row < 1 || col < 1) {
          return new CellError(ErrorType.VALUE, 'INDEX 행·열 번호는 1 이상이어야 합니다.');
        }
        if (row > range.height() || col > range.width()) {
          return new CellError(ErrorType.REF, 'INDEX 행 또는 열 번호가 범위를 벗어났습니다.');
        }
        const value = range.data[row - 1]?.[col - 1];
        return value === undefined ? new CellError(ErrorType.REF) : value;
      },
    );
  }

  match(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('MATCH'),
      (keyArg: unknown, range: SimpleRangeValue, type: number) => {
        if (![-1, 0, 1].includes(type)) {
          return new CellError(ErrorType.VALUE, 'MATCH 일치 유형은 -1, 0, 1 중 하나여야 합니다.');
        }
        if (range.width() > 1 && range.height() > 1) {
          return new CellError(ErrorType.NA);
        }
        const key = keyArg === EmptyValue ? 0 : keyArg;
        const values = range.valuesFromTopLeftCorner();
        let found = -1;
        if (type === 0) {
          const matcher =
            typeof key === 'string' && /[*?~]/.test(key) ? wildcardPattern(key) : null;
          found = values.findIndex((value) =>
            matcher
              ? typeof value === 'string' && matcher.test(value)
              : compareScalars(value, key) === 0,
          );
        } else {
          // 정렬된 범위를 가정하고 앞에서부터 본다. 오름차순(1)은 key 이하의 마지막, 내림차순(-1)은 key 이상의 마지막.
          for (let i = 0; i < values.length; i += 1) {
            const order = compareScalars(values[i], key);
            if (order === null) {
              continue;
            }
            if (type === 1 ? order > 0 : order < 0) {
              break;
            }
            found = i;
          }
        }
        return found < 0
          ? new CellError(ErrorType.NA, 'MATCH: 찾는 값이 범위에 없습니다.')
          : found + 1;
      },
    );
  }

  int(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(ast.args, state, this.metadata('INT'), (value: number) =>
      Math.floor(value),
    );
  }

  round(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('ROUND'),
      (value: number, places: number) => roundDecimal(value, places, 'round'),
    );
  }

  roundup(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('ROUNDUP'),
      (value: number, places: number) => roundDecimal(value, places, 'up'),
    );
  }

  rounddown(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('ROUNDDOWN'),
      (value: number, places: number) => roundDecimal(value, places, 'down'),
    );
  }

  edate(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('EDATE'),
      (serial: number, months: number) => {
        const start = this.dateTimeHelper.numberToSimpleDate(serial);
        const total = start.year * 12 + (start.month - 1) + Math.trunc(months);
        const year = Math.floor(total / 12);
        const month = total - year * 12 + 1;
        const day = Math.min(start.day, this.dateTimeHelper.daysInMonth(year, month));
        const result = this.dateTimeHelper.getWithinBounds(
          this.dateTimeHelper.dateToNumber({ year, month, day }),
        );
        return result === undefined
          ? new CellError(ErrorType.NUM, 'EDATE: 표현할 수 없는 날짜입니다.')
          : result;
      },
    );
  }

  datedif(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('DATEDIF'),
      (startDate: number, endDate: number, unitArg: string) => {
        const unit = unitArg.toUpperCase();
        if (startDate > endDate) {
          return new CellError(ErrorType.NUM, 'DATEDIF: 시작일이 종료일보다 늦습니다.');
        }
        if (unit === 'D') {
          return Math.floor(endDate) - Math.floor(startDate);
        }
        const helper = this.dateTimeHelper;
        const start = helper.numberToSimpleDate(startDate);
        const end = helper.numberToSimpleDate(endDate);
        const beforeAnniversary =
          end.month < start.month || (end.month === start.month && end.day < start.day);
        switch (unit) {
          case 'M':
            return (
              (end.year - start.year) * 12 +
              (end.month - start.month) -
              (end.day < start.day ? 1 : 0)
            );
          case 'YM':
            return (12 + (end.month - start.month) - (end.day < start.day ? 1 : 0)) % 12;
          case 'Y':
            return end.year - start.year - (beforeAnniversary ? 1 : 0);
          case 'MD': {
            if (end.day >= start.day) {
              return end.day - start.day;
            }
            const month = end.month === 1 ? 12 : end.month - 1;
            const year = end.month === 1 ? end.year - 1 : end.year;
            return helper.daysInMonth(year, month) + end.day - start.day;
          }
          case 'YD':
            // 2000-05-15 ~ 2024-03-15에서 Excel은 304, 이 계산은 305다. 규칙을 알 수 없어 그대로 둔다(EXCEL_DIFFERENCES 미확인 항목).
            return beforeAnniversary
              ? Math.floor(endDate) -
                  Math.floor(startDate) -
                  365 * (end.year - start.year - 1) -
                  helper.leapYearsCount(end.year - 1) +
                  helper.leapYearsCount(start.year)
              : Math.floor(endDate) -
                  helper.dateToNumber({ year: end.year, month: start.month, day: start.day });
          default:
            return new CellError(
              ErrorType.NUM,
              'DATEDIF: 단위는 Y, M, D, MD, YM, YD 중 하나여야 합니다.',
            );
        }
      },
    );
  }

  text(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('TEXT'),
      (value: number, format: string) => {
        const result = formatTextValue(value, format, (serial) => {
          try {
            return this.dateTimeHelper.numberToSimpleDate(serial);
          } catch {
            return undefined;
          }
        });
        if (result.kind === 'text') {
          return result.text;
        }
        return new CellError(ErrorType.VALUE, 'TEXT: 지원하지 않는 서식입니다.');
      },
    );
  }
}

/** FILTER를 Excel 규칙으로: FILTER(배열, 조건, [일치 없을 때 값]). 여러 열 원본과 가로 방향 조건을 지원한다. */
const FilterBase = HyperFormula.getFunctionPlugin('FILTER');
if (FilterBase === undefined) {
  throw new Error('HyperFormula에 FILTER 플러그인이 없습니다.');
}

export class ExcelFilterPlugin extends FilterBase {
  static override implementedFunctions = {
    FILTER: {
      method: 'excelFilter',
      // 결과 크기 예측은 HyperFormula 원래 플러그인(ArrayPlugin)의 메서드를 그대로 쓴다.
      sizeOfResultArrayMethod: 'filterArraySize',
      enableArrayArithmeticForArguments: true,
      parameters: [
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.ANY, optionalArg: true },
      ],
    },
  };

  excelFilter(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('FILTER'),
      (array: SimpleRangeValue, include: SimpleRangeValue, ifEmpty?: unknown) => {
        const byRow = include.width() === 1 && include.height() === array.height();
        const byColumn = !byRow && include.height() === 1 && include.width() === array.width();
        if (!byRow && !byColumn) {
          return new CellError(ErrorType.VALUE, 'FILTER 조건의 크기가 배열과 맞지 않습니다.');
        }
        const flags: boolean[] = [];
        for (const value of include.valuesFromTopLeftCorner()) {
          const flag = includeFlag(value);
          if (flag instanceof CellError) {
            return flag;
          }
          flags.push(flag);
        }
        const rows = array.data.map((row, i) =>
          byRow ? (flags[i] ? row : []) : row.filter((_, j) => flags[j]),
        );
        const kept = rows.filter((row) => row.length > 0);
        if (kept.length === 0) {
          // Excel은 #CALC!를 돌려주지만 HyperFormula에는 그 오류 코드가 없어 #N/A로 둔다(EXCEL_DIFFERENCES).
          if (ifEmpty === undefined) {
            return new CellError(ErrorType.NA, 'FILTER: 조건에 맞는 값이 없습니다.');
          }
          if (
            ifEmpty instanceof CellError ||
            typeof ifEmpty === 'string' ||
            typeof ifEmpty === 'boolean'
          ) {
            return ifEmpty;
          }
          return rawNumber(ifEmpty) ?? EmptyValue;
        }
        return SimpleRangeValue.onlyValues(kept);
      },
    );
  }
}

/** 함수 이름 번역(HyperFormula 언어 팩 enGB 기준). */
export const EXCEL_COMPAT_TRANSLATIONS = {
  enGB: {
    CONCAT: 'CONCAT',
    CONCATENATE: 'CONCATENATE',
    TEXTJOIN: 'TEXTJOIN',
    LEN: 'LEN',
    INDEX: 'INDEX',
    MATCH: 'MATCH',
    INT: 'INT',
    ROUND: 'ROUND',
    ROUNDUP: 'ROUNDUP',
    ROUNDDOWN: 'ROUNDDOWN',
    EDATE: 'EDATE',
    DATEDIF: 'DATEDIF',
    TEXT: 'TEXT',
  },
};

export const EXCEL_FILTER_TRANSLATIONS = { enGB: { FILTER: 'FILTER' } };

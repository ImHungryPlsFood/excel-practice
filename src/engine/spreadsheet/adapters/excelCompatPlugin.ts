/*
 * HyperFormula에 없거나 Excel과 결과가 다른 함수를 Excel 동작에 맞춰 구현한 플러그인 (CARD-02B).
 * 골든 대조(docs/EXCEL_DIFFERENCES.md 1장)에서 드러난 차이를 고친다.
 *   - CONCAT: HyperFormula 3.5.0에 없다(D-1). Excel 2019+ 함수.
 *   - INDEX: HyperFormula는 범위 밖 번호에 #NUM!을 돌려준다. Excel은 #REF!다(D-2).
 * Excel 동작 근거: Microsoft 지원 문서 "CONCAT 함수", "INDEX 함수".
 */

import {
  CellError,
  EmptyValue,
  ErrorType,
  FunctionArgumentType,
  FunctionPlugin,
  type SimpleRangeValue,
} from 'hyperformula';

import { formatGeneralNumber } from '../numberFormat';

/** Excel 셀 하나에 담을 수 있는 최대 글자 수. 넘으면 CONCAT은 #VALUE!. */
export const EXCEL_MAX_CELL_TEXT = 32_767;

// HyperFormula 내부 형식(ProcedureAst, InterpreterState)은 패키지 밖으로 공개되지 않아 runFunction의 매개변수에서 꺼낸다.
type RunFunction = ExcelCompatPlugin['runFunction'];
type FunctionAst = { args: Parameters<RunFunction>[0] };
type InterpreterState = Parameters<RunFunction>[1];

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

/** CONCAT 인수 하나를 Excel 규칙으로 문자열로. 빈 셀은 빈 문자열, 논리값은 TRUE/FALSE, 숫자는 일반 서식. */
function concatPiece(value: unknown): string | CellError {
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
  return new CellError(ErrorType.VALUE, 'CONCAT 인수를 문자열로 바꿀 수 없습니다.');
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
    INDEX: {
      method: 'index',
      parameters: [
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.NUMBER },
        { argumentType: FunctionArgumentType.NUMBER, optionalArg: true },
      ],
    },
  };

  concat(ast: FunctionAst, state: InterpreterState) {
    return this.runFunction(ast.args, state, this.metadata('CONCAT'), (...values: unknown[]) => {
      let text = '';
      for (const value of values) {
        const piece = concatPiece(value);
        if (piece instanceof CellError) {
          return piece;
        }
        text += piece;
      }
      if (text.length > EXCEL_MAX_CELL_TEXT) {
        return new CellError(ErrorType.VALUE, `결과가 ${EXCEL_MAX_CELL_TEXT}자를 넘습니다.`);
      }
      return text;
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
}

/** 함수 이름 번역(HyperFormula 언어 팩 enGB 기준). */
export const EXCEL_COMPAT_TRANSLATIONS = {
  enGB: { CONCAT: 'CONCAT', INDEX: 'INDEX' },
};

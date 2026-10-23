/*
 * 오류 코드별·함수별 한국어 안내 (CARD-02B, R-08.19, R-08.23, R-08.25).
 * 계산은 엔진이 하고, 이 모듈은 결과 오류 코드를 학습자가 이해할 수 있는 문장으로 바꾸기만 한다.
 */

import type { CellErrorCode } from './FormulaEngineAdapter';
import { KNOWN_UNSUPPORTED_FUNCTIONS } from './supportedFunctions';

const GENERIC_MESSAGES: Record<CellErrorCode, string> = {
  '#DIV/0!': '0으로 나눌 수 없습니다. 나누는 값(분모)이 0이거나 빈 셀인지 확인하세요.',
  '#VALUE!': '값의 종류가 맞지 않습니다. 숫자가 필요한 곳에 문자가 들어갔는지 확인하세요.',
  '#REF!': '참조한 셀이 없거나 범위를 벗어났습니다.',
  '#NAME?': '함수 이름이나 이름 있는 범위를 알 수 없습니다. 철자를 확인하세요.',
  '#NUM!':
    '계산할 수 없는 숫자입니다. 음수의 제곱근처럼 수학적으로 정의되지 않는 값인지 확인하세요.',
  '#N/A': '찾는 값이 없습니다.',
  '#NULL!': '두 범위가 겹치지 않습니다.',
  '#SPILL!': '배열 결과를 펼칠 칸이 다른 값으로 막혀 있습니다.',
  '#CYCLE!': '순환 참조입니다. 수식이 직접 또는 다른 셀을 거쳐 자기 자신을 참조하고 있습니다.',
  '#ERROR!': '수식 문법이 올바르지 않습니다. 괄호와 쉼표, 따옴표를 확인하세요.',
};

/** 같은 오류 코드라도 함수마다 원인이 달라 더 구체적으로 안내할 수 있는 경우. */
const FUNCTION_MESSAGES: Readonly<Record<string, Partial<Record<CellErrorCode, string>>>> = {
  VLOOKUP: {
    '#N/A': 'VLOOKUP: 찾는 값이 범위의 첫 번째 열에 없습니다.',
    '#REF!': 'VLOOKUP: 열 번호가 범위의 열 개수보다 큽니다.',
    '#VALUE!': 'VLOOKUP: 열 번호는 1 이상이어야 합니다.',
  },
  XLOOKUP: { '#N/A': 'XLOOKUP: 찾는 값이 조회 범위에 없습니다.' },
  MATCH: { '#N/A': 'MATCH: 찾는 값이 범위에 없습니다.' },
  INDEX: {
    '#REF!': 'INDEX: 행 또는 열 번호가 범위를 벗어났습니다.',
    '#NUM!': 'INDEX: 행 또는 열 번호가 범위를 벗어났습니다.',
    '#VALUE!':
      'INDEX: 행·열 번호는 1 이상이어야 합니다. 행·열 전체(0)를 돌려주는 기능은 지원하지 않습니다.',
  },
  SQRT: { '#NUM!': 'SQRT: 음수의 제곱근은 구할 수 없습니다.' },
  DATE: { '#NUM!': 'DATE: 1900-01-01 이전이거나 표현할 수 없는 날짜입니다.' },
  DATEVALUE: { '#VALUE!': 'DATEVALUE: 날짜로 해석할 수 없는 문자열입니다.' },
  AVERAGE: { '#DIV/0!': 'AVERAGE: 평균을 낼 숫자가 하나도 없습니다.' },
};

/**
 * 수식에서 호출한 함수 이름을 나온 순서대로 뽑는다(대문자, 중복 제거).
 * 문자열 리터럴("...") 안의 글자는 함수로 보지 않는다. 메시지 선택용이며 계산에는 쓰지 않는다.
 */
export function extractFunctionNames(formula: string): string[] {
  const withoutStrings = formula.replace(/"(?:[^"]|"")*"/g, '""');
  const names: string[] = [];
  for (const match of withoutStrings.matchAll(/([A-Za-z_][A-Za-z0-9_.]*)\s*\(/g)) {
    const name = (match[1] ?? '').toUpperCase();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

// 셀·범위 참조 하나: 선택적 시트 이름(Sheet1! 또는 '시트 이름'!), $ 고정, 범위(A1:B2).
const REFERENCE = String.raw`(?:(?:'(?:[^']|'')+'|[A-Za-z_][\w.]*)!)?\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?`;
const INTERSECTION = new RegExp(String.raw`(${REFERENCE})(\s+)(?=${REFERENCE})`, 'g');

export const INTERSECTION_UNSUPPORTED_MESSAGE =
  '교집합 연산자(두 범위 사이의 공백)는 지원하지 않습니다. 겹치는 셀을 직접 참조하거나 범위를 쉼표로 나눠 함수에 넣으세요.';

/**
 * 구문 오류 수식이 Excel 교집합 연산자(참조 사이 공백) 때문인지 판정한다.
 * 참조 사이 공백을 +로 바꿨을 때 엔진이 문법상 올바른 수식으로 받아들이면 교집합 때문이라고 본다.
 * 다른 문법 오류는 바꿔도 여전히 틀리므로 이 안내로 바뀌지 않는다.
 */
export function usesIntersectionOperator(
  formula: string,
  isValidFormula: (formula: string) => boolean,
): boolean {
  // 문자열 리터럴은 길이가 같은 자리 표시로 바꿔, 따옴표 안 공백을 연산자로 보지 않는다.
  const masked = formula.replace(
    /"(?:[^"]|"")*"/g,
    (literal) => `"${'_'.repeat(literal.length - 2)}"`,
  );
  const positions = [...masked.matchAll(INTERSECTION)].map(
    (match) => (match.index ?? 0) + (match[1] ?? '').length,
  );
  if (positions.length === 0) {
    return false;
  }
  let rewritten = formula;
  for (const position of positions.reverse()) {
    const spaces = /^\s+/.exec(rewritten.slice(position))?.[0] ?? '';
    rewritten = `${rewritten.slice(0, position)}+${rewritten.slice(position + spaces.length)}`;
  }
  return isValidFormula(rewritten);
}

export interface ErrorContext {
  isFunctionSupported: (name: string) => boolean;
  isValidFormula: (formula: string) => boolean;
}

/**
 * 오류 코드에 맞는 안내문.
 * - #NAME?이고 수식에 엔진이 모르는 함수가 있으면 그 함수를 이름으로 알린다(R-08.25).
 * - 구문 오류(#ERROR!)가 교집합 연산자 때문이면 미지원 기능이라고 알린다(R-08.25).
 * - 수식의 함수 중 해당 코드에 대한 전용 안내가 있으면 첫 번째 것을 쓴다(R-08.23).
 */
export function describeError(
  code: CellErrorCode,
  formula: string | undefined,
  { isFunctionSupported, isValidFormula }: ErrorContext,
): string {
  if (code === '#ERROR!' && formula && usesIntersectionOperator(formula, isValidFormula)) {
    return INTERSECTION_UNSUPPORTED_MESSAGE;
  }
  const functions = formula ? extractFunctionNames(formula) : [];
  if (code === '#NAME?') {
    const unknown = functions.find((name) => !isFunctionSupported(name));
    if (unknown) {
      return KNOWN_UNSUPPORTED_FUNCTIONS[unknown] ?? `지원하지 않는 함수입니다: ${unknown}`;
    }
  }
  for (const name of functions) {
    const specific = FUNCTION_MESSAGES[name]?.[code];
    if (specific) {
      return specific;
    }
  }
  return GENERIC_MESSAGES[code];
}

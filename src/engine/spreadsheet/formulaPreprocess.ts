/*
 * 수식 문자열 전처리 (CARD-02B 추가 작업, docs/EXCEL_DIFFERENCES.md D-4).
 * HyperFormula는 수식 안의 지수 표기 숫자(1E+3)를 파싱하지 못한다. Excel은 입력하면 1000으로 바꿔 저장한다.
 * 같은 일을 엔진에 넣기 전에 한다. 정규식 하나로 바꾸면 셀 주소(E1, AE10)나 문자열·시트 이름 안의 글자까지 바뀌므로
 * 문자 단위로 토큰을 나눠, 숫자 토큰만 바꾸고 나머지는 한 글자도 건드리지 않는다.
 *
 * 토큰 종류:
 *   - 큰따옴표 문자열 "..." ("" 은 따옴표 글자)       → 그대로
 *   - 작은따옴표 시트 이름 '...'! ('' 은 따옴표 글자) → 그대로
 *   - 식별자(함수 이름, 셀 주소, 이름 있는 범위, 시트 이름): 영문·_·$로 시작해 영문·숫자·_·.·$가 이어지는 것 → 그대로
 *   - 숫자: 숫자 또는 .숫자로 시작 (식별자에 붙어 있지 않은 것) → 지수 표기가 있으면 일반 소수로 풀어 쓴다
 *   - 그 밖의 글자 → 그대로
 */

/** 지수의 절댓값이 이보다 크면 바꾸지 않고 엔진이 오류로 처리하게 둔다(배정밀도 실수의 최대 지수가 308이다). */
const MAX_EXPONENT = 308;

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isIdentifierStart(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_' || ch === '$';
}

function isIdentifierPart(ch: string): boolean {
  return isIdentifierStart(ch) || isDigit(ch) || ch === '.';
}

/** 따옴표로 시작하는 위치에서 닫는 따옴표 다음 위치까지. 닫히지 않으면 끝까지. 두 번 겹친 따옴표는 글자로 본다. */
function skipQuoted(text: string, start: number): number {
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

/** 가수 문자열(정수부, 소수부)과 지수를 소수 표기 문자열로. 부동소수 변환 없이 자릿수만 옮긴다. */
function expandExponent(integer: string, fraction: string, exponent: number): string {
  const digits = integer + fraction;
  const point = integer.length + exponent;
  let result: string;
  if (point <= 0) {
    result = `0.${'0'.repeat(-point)}${digits}`;
  } else if (point >= digits.length) {
    result = digits + '0'.repeat(point - digits.length);
  } else {
    result = `${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  // 앞의 불필요한 0과 소수 끝의 0을 정리한다.
  result = result.replace(/^0+(?=\d)/, '');
  if (result.includes('.')) {
    result = result.replace(/0+$/, '').replace(/\.$/, '');
  }
  return result === '' ? '0' : result;
}

/** 숫자 토큰을 읽는다. 토큰 끝 위치와 (지수 표기였다면) 풀어 쓴 문자열을 돌려준다. */
function readNumber(text: string, start: number): { end: number; replacement: string | null } {
  let i = start;
  while (isDigit(text.charAt(i))) {
    i += 1;
  }
  const integer = text.slice(start, i);
  let fraction = '';
  if (text.charAt(i) === '.') {
    const fractionStart = i + 1;
    let j = fractionStart;
    while (isDigit(text.charAt(j))) {
      j += 1;
    }
    fraction = text.slice(fractionStart, j);
    i = j;
  }
  const marker = text.charAt(i);
  if (marker === 'E' || marker === 'e') {
    let j = i + 1;
    const sign = text.charAt(j);
    if (sign === '+' || sign === '-') {
      j += 1;
    }
    const exponentStart = j;
    while (isDigit(text.charAt(j))) {
      j += 1;
    }
    if (j > exponentStart) {
      const exponent = Number(text.slice(exponentStart, j)) * (sign === '-' ? -1 : 1);
      if (Math.abs(exponent) <= MAX_EXPONENT) {
        return { end: j, replacement: expandExponent(integer, fraction, exponent) };
      }
      return { end: j, replacement: null };
    }
  }
  return { end: i, replacement: null };
}

/** 수식(또는 일반 값)에서 지수 표기 숫자 리터럴만 일반 소수로 바꾼다. '='로 시작하지 않는 문자열은 그대로 돌려준다. */
export function normalizeNumberLiterals(content: string): string {
  if (!content.startsWith('=')) {
    return content;
  }
  let out = '';
  let i = 0;
  while (i < content.length) {
    const ch = content.charAt(i);
    if (ch === '"' || ch === "'") {
      const end = skipQuoted(content, i);
      out += content.slice(i, end);
      i = end;
    } else if (isIdentifierStart(ch)) {
      let end = i + 1;
      while (end < content.length && isIdentifierPart(content.charAt(end))) {
        end += 1;
      }
      out += content.slice(i, end);
      i = end;
    } else if (isDigit(ch) || (ch === '.' && isDigit(content.charAt(i + 1)))) {
      const { end, replacement } = readNumber(content, i);
      out += replacement ?? content.slice(i, end);
      i = end;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

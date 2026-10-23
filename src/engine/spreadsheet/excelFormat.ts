/*
 * Excel 규칙의 반올림과 TEXT 서식 변환 (CARD-02B 추가 작업, docs/EXCEL_DIFFERENCES.md).
 * HyperFormula의 ROUND는 이진 부동소수에 10^n을 곱해 반올림해서 1.005 → 1처럼 Excel(1.01)과 다르다.
 * Excel은 값을 유효 숫자 15자리로 본 뒤 십진수로 반올림한다. 같은 방식으로 자릿수를 옮긴다.
 */

export type RoundMode = 'round' | 'up' | 'down';

/** value × 10^places를 지수 표기 문자열 변환으로 구한다(곱셈 오차가 없다). */
function shiftDecimal(value: number, places: number): number {
  const [mantissa = '0', exponent = '0'] = value.toExponential(14).split('e');
  return Number(`${mantissa}e${Number(exponent) + places}`);
}

/**
 * ROUND·ROUNDUP·ROUNDDOWN. 자릿수는 정수로 버린다(Excel: 2.9 → 2). 0에서 멀어지는 쪽이 올림이다.
 * 값이 15자리 유효 숫자로 정리된 십진수라고 보고 계산하므로 0.285는 0.29, 0.1+0.2는 0.3으로 본다.
 */
export function roundDecimal(value: number, places: number, mode: RoundMode): number {
  if (value === 0 || !Number.isFinite(value)) {
    return value;
  }
  const digits = Math.trunc(places);
  const shifted = shiftDecimal(Math.abs(value), digits);
  if (!Number.isFinite(shifted)) {
    return value;
  }
  const whole =
    mode === 'round'
      ? Math.round(shifted)
      : mode === 'up'
        ? Math.ceil(shifted)
        : Math.floor(shifted);
  const result = shiftDecimal(whole, -digits);
  if (result === 0) {
    return 0;
  }
  return value < 0 ? -result : result;
}

/** TEXT가 지원하는 날짜 코드. 구분 기호는 - / . 공백. m은 항상 월이다(시간 서식은 지원하지 않는다). */
const DATE_TOKEN = /yyyy|yy|mm|m|dd|d|[-/. ]/g;
const NUMBER_FORMAT = /^(#,##0|0+)(?:\.(0+))?(%)?$/;

export interface SimpleDateParts {
  year: number;
  month: number;
  day: number;
}

/** TEXT 서식 지원 범위. docs/EXCEL_DIFFERENCES.md "TEXT 함수" 절과 같아야 한다. */
export const TEXT_FORMAT_HELP =
  '지원하는 서식: 0, 000(앞자리 0), 0.0, 0.00, #,##0, #,##0.00, 0%, 0.0%, 날짜(yyyy, yy, mm, m, dd, d와 - / . 공백을 조합, 예: yyyy-mm-dd).';

function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatNumber(value: number, match: RegExpExecArray): string | undefined {
  const [, integerPart = '', decimalPart = '', percent = ''] = match;
  const decimals = decimalPart.length;
  const scaled = percent ? shiftDecimal(value, 2) : value;
  const rounded = roundDecimal(scaled, decimals, 'round');
  if (Math.abs(rounded) >= 1e15) {
    return undefined;
  }
  const fixed = Math.abs(rounded).toFixed(decimals);
  const [whole = '0', fraction] = fixed.split('.');
  const padded = integerPart === '#,##0' ? whole : whole.padStart(integerPart.length, '0');
  const integerText = integerPart === '#,##0' ? groupThousands(padded) : padded;
  const body = fraction === undefined ? integerText : `${integerText}.${fraction}`;
  return `${rounded < 0 ? '-' : ''}${body}${percent}`;
}

const ALLOWED_DATE_CODES = new Set(['yyyy', 'yy', 'mm', 'm', 'dd', 'd']);

/** 지원하는 날짜 서식이면 토큰 목록, 아니면 undefined. 같은 글자의 연속(mmm, dddd 등)은 코드 하나로 완전히 일치해야 한다. */
function parseDateFormat(format: string): string[] | undefined {
  const lower = format.toLowerCase();
  const tokens = lower.match(DATE_TOKEN);
  if (!tokens || tokens.join('') !== lower || !tokens.some((t) => /[ymd]/.test(t))) {
    return undefined;
  }
  const runs = lower.match(/[ymd]+/g) ?? [];
  return runs.every((run) => ALLOWED_DATE_CODES.has(run)) ? tokens : undefined;
}

function formatDate(
  serial: number,
  tokens: string[],
  toDate: (serial: number) => SimpleDateParts | undefined,
): string | undefined {
  const date = toDate(Math.floor(serial));
  if (!date) {
    return undefined;
  }
  const two = (n: number) => String(n).padStart(2, '0');
  return tokens
    .map((token) => {
      switch (token) {
        case 'yyyy':
          return String(date.year).padStart(4, '0');
        case 'yy':
          return two(date.year % 100);
        case 'mm':
          return two(date.month);
        case 'm':
          return String(date.month);
        case 'dd':
          return two(date.day);
        case 'd':
          return String(date.day);
        default:
          return token;
      }
    })
    .join('');
}

export type TextFormatResult =
  { kind: 'text'; text: string } | { kind: 'unsupported-format' } | { kind: 'invalid-value' };

/** TEXT(value, format). 지원하지 않는 서식은 틀린 값을 만드는 대신 unsupported-format으로 알린다. */
export function formatTextValue(
  value: number,
  format: string,
  toDate: (serial: number) => SimpleDateParts | undefined,
): TextFormatResult {
  const numeric = NUMBER_FORMAT.exec(format);
  if (numeric) {
    const text = formatNumber(value, numeric);
    return text === undefined ? { kind: 'unsupported-format' } : { kind: 'text', text };
  }
  const tokens = parseDateFormat(format);
  if (tokens) {
    if (value < 1) {
      // 서식은 맞지만 날짜로 바꿀 수 없는 값 (Excel도 #VALUE!)
      return { kind: 'invalid-value' };
    }
    const text = formatDate(value, tokens, toDate);
    return text === undefined ? { kind: 'invalid-value' } : { kind: 'text', text };
  }
  return { kind: 'unsupported-format' };
}

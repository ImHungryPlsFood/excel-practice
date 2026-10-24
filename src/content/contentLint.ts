import { KNOWN_UNSUPPORTED_FUNCTIONS } from '@/engine/spreadsheet/supportedFunctions';

/*
 * 콘텐츠 작성 지침 검사 (CARD-03A, docs/CURRICULUM.md 1.3절).
 * 수식 문자열만 보고 판정할 수 있는 규칙을 순수 함수로 구현한다. 튜토리얼 스키마가 정답 수식에 적용하고,
 * 문제 스키마·verify-content(CARD-04E)도 같은 함수를 쓴다.
 *
 * 검사하지 못하는 것(셀 데이터를 계산해야 알 수 있음. src/content/verifyContent.ts가 엔진으로 계산해 검사한다, CARD-04E):
 *   - AVERAGE 등 결과가 소수가 되는 함수를 & 로 잇는 경우, 데이터 때문에 소수가 되는 나눗셈 결과
 *   - FILTER 일치 값 없음(D-12), UNIQUE 대상의 빈 셀(D-13)
 */

export type LintRule =
  'UNSUPPORTED_FUNCTION' | 'INDEX_ZERO' | 'DATEDIF_YD' | 'TEXT_FORMAT' | 'AMPERSAND_DECIMAL';

export interface LintIssue {
  rule: LintRule;
  message: string;
}

/** 엔진이 계산하지 못해 문항에 쓸 수 없는 함수. KNOWN_UNSUPPORTED_FUNCTIONS에 ADR-001 §3.2·D-8의 나머지를 더한다. */
const FORBIDDEN_FUNCTIONS: ReadonlySet<string> = new Set([
  ...Object.keys(KNOWN_UNSUPPORTED_FUNCTIONS),
  'LOOKUP',
  'SORTBY',
  'LET',
  'INDIRECT',
]);

const NUMBER_TEXT_FORMAT = /^(?:0+(?:\.0+)?|#,##0(?:\.0+)?|0(?:\.0+)?%)$/;
const DATE_PART = '(?:y{2,4}|m{1,2}|d{1,2})';
const DATE_TEXT_FORMAT = new RegExp(`^${DATE_PART}(?:[-/.]${DATE_PART})*$`, 'i');

/** 소수 오차 없이 이어 붙일 수 있도록 결과를 정리하는 함수. 이 함수가 피연산자 전체를 감싸면 안전하다. */
const SAFE_WRAPPERS = /^(?:ROUND|ROUNDUP|ROUNDDOWN|TEXT|FIXED|INT|TRUNC)$/i;

/** 따옴표 문자열 안의 글자를 같은 길이의 '_'로 바꾼다. 따옴표 자체는 남긴다. */
function maskStrings(formula: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < formula.length; i += 1) {
    const ch = formula.charAt(i);
    if (ch === '"') {
      if (inString && formula.charAt(i + 1) === '"') {
        out += '__';
        i += 1;
        continue;
      }
      inString = !inString;
      out += ch;
    } else {
      out += inString ? '_' : ch;
    }
  }
  return out;
}

/** text에서 open 위치의 '(' 와 짝이 되는 ')' 위치. 없으면 -1. */
function matchingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 최상위(괄호 밖) 구분자로 [start, end) 조각들을 나눈다. */
function splitTopLevel(
  masked: string,
  start: number,
  end: number,
  separators: string,
): Array<[number, number]> {
  const parts: Array<[number, number]> = [];
  let depth = 0;
  let from = start;
  for (let i = start; i < end; i += 1) {
    const ch = masked.charAt(i);
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (depth === 0 && separators.includes(ch)) {
      parts.push([from, i]);
      from = i + 1;
    }
  }
  parts.push([from, end]);
  return parts;
}

interface FunctionCall {
  name: string;
  /** 인수 조각의 [start, end) 위치 */
  args: Array<[number, number]>;
}

function findFunctionCalls(masked: string): FunctionCall[] {
  const calls: FunctionCall[] = [];
  const pattern = /([A-Za-z][A-Za-z0-9._]*)\s*\(/g;
  let match = pattern.exec(masked);
  while (match !== null) {
    const open = match.index + match[0].length - 1;
    const close = matchingParen(masked, open);
    if (close !== -1) {
      calls.push({
        name: (match[1] ?? '').toUpperCase(),
        args: splitTopLevel(masked, open + 1, close, ',;'),
      });
    }
    match = pattern.exec(masked);
  }
  return calls;
}

/** 인수가 숫자 리터럴 하나뿐이면 그 값을, 아니면 null. */
function literalNumber(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
}

/** 피연산자에서 함수 호출의 괄호 안쪽을 지운 겉모습. 일반 괄호 묶음은 그대로 둔다. */
function operandSurface(operand: string): string {
  let out = '';
  for (let i = 0; i < operand.length; i += 1) {
    const ch = operand.charAt(i);
    if (ch === '(' && /[A-Za-z0-9._]\s*$/.test(out)) {
      const close = matchingParen(operand, i);
      if (close === -1) {
        out += ch;
        continue;
      }
      out += '()';
      i = close;
    } else {
      out += ch;
    }
  }
  return out;
}

function isSafeOperand(masked: string): boolean {
  const trimmed = masked.trim();
  const call = /^([A-Za-z][A-Za-z0-9._]*)\s*\(/.exec(trimmed);
  if (call === null || !SAFE_WRAPPERS.test(call[1] ?? '')) return false;
  return matchingParen(trimmed, trimmed.indexOf('(')) === trimmed.length - 1;
}

function isRiskyOperand(masked: string): boolean {
  if (isSafeOperand(masked)) return false;
  const surface = operandSurface(masked);
  return surface.includes('/') || /\d\.\d/.test(surface);
}

/** & 로 이어진 피연산자 묶음을 모든 중첩 깊이에서 찾아 피연산자마다 visit을 부른다. */
function visitAmpersandOperands(masked: string, visit: (from: number, to: number) => void): void {
  const walk = (start: number, end: number): void => {
    const parts = splitTopLevel(masked, start, end, '&');
    if (parts.length > 1) {
      for (const [from, to] of parts) visit(from, to);
    }
    for (const [from, to] of parts) {
      let i = from;
      while (i < to) {
        if (masked.charAt(i) === '(') {
          const close = matchingParen(masked, i);
          if (close === -1 || close >= to) break;
          for (const [argFrom, argTo] of splitTopLevel(masked, i + 1, close, ',;')) {
            walk(argFrom, argTo);
          }
          i = close;
        }
        i += 1;
      }
    }
  };
  walk(0, masked.length);
}

function lintAmpersands(masked: string, original: string, issues: LintIssue[]): void {
  visitAmpersandOperands(masked, (from, to) => {
    if (isRiskyOperand(masked.slice(from, to))) {
      issues.push({
        rule: 'AMPERSAND_DECIMAL',
        message: `& 로 잇는 '${original.slice(from, to).trim()}'은 소수가 될 수 있습니다. ROUND 등으로 먼저 감싸세요. (Excel과 엔진의 소수 표시가 다릅니다, D-9)`,
      });
    }
  });
}

/** 숫자를 글자로 바꿔 돌려주는 함수와, 바꿀 값이 들어가는 인수 위치를 고르는 규칙. */
const NUMBER_TO_TEXT_FUNCTIONS: Readonly<Record<string, (index: number) => boolean>> = {
  CONCAT: () => true,
  CONCATENATE: () => true,
  TEXTJOIN: (index) => index >= 2, // 구분자·빈 값 무시 여부는 글자로 바꿀 값이 아니다
  TEXT: (index) => index === 0,
  FIXED: (index) => index === 0,
  DOLLAR: (index) => index === 0,
};

/** 따옴표 문자열 전체, 숫자 상수, ROUND 등으로 감싼 값은 글자로 바뀌어도 결과가 안정적이다. */
function isStableTextOperand(masked: string): boolean {
  const trimmed = masked.trim();
  return (
    trimmed === '' ||
    /^"_*"$/.test(trimmed) ||
    /^\d+(?:\.\d+)?$/.test(trimmed) ||
    isSafeOperand(trimmed)
  );
}

/**
 * 수식이 셀 값(숫자일 수 있는)을 글자로 바꿔 쓰는지. &, CONCAT, CONCATENATE, TEXTJOIN, TEXT, FIXED, DOLLAR의
 * 인수가 ROUND 등으로 감싸지 않은 참조·계산식이면 true. 이런 문제는 소수 데이터로 교란하면
 * 엔진과 Excel의 글자 변환 차이(D-6, D-9)가 드러나 채점이 어긋날 수 있다.
 */
export function convertsNumbersToText(formula: string): boolean {
  const masked = maskStrings(formula).replace(/^\s*=/, '');
  let found = false;
  visitAmpersandOperands(masked, (from, to) => {
    if (!isStableTextOperand(masked.slice(from, to))) found = true;
  });
  if (found) return true;
  for (const call of findFunctionCalls(masked)) {
    const takesText = NUMBER_TO_TEXT_FUNCTIONS[call.name];
    if (takesText === undefined) continue;
    const unstable = call.args.some(
      ([from, to], index) => takesText(index) && !isStableTextOperand(masked.slice(from, to)),
    );
    if (unstable) return true;
  }
  return false;
}

/**
 * 글자로 바뀌는 값 가운데 결과가 안정적이지 않은 피연산자(참조·계산식·ROUND 없이 감싼 함수)의 원문.
 * convertsNumbersToText와 같은 규칙이다. verify-content가 이 피연산자를 엔진으로 계산해
 * 데이터 때문에 소수가 되는지 본다(CARD-04E).
 */
export function unstableTextOperands(formula: string): string[] {
  const masked = maskStrings(formula).replace(/^\s*=/, '');
  const source = formula.replace(/^\s*=/, '');
  const found = new Set<string>();
  visitAmpersandOperands(masked, (from, to) => {
    if (!isStableTextOperand(masked.slice(from, to))) found.add(source.slice(from, to).trim());
  });
  for (const call of findFunctionCalls(masked)) {
    const takesText = NUMBER_TO_TEXT_FUNCTIONS[call.name];
    if (takesText === undefined) continue;
    call.args.forEach(([from, to], index) => {
      if (takesText(index) && !isStableTextOperand(masked.slice(from, to))) {
        found.add(source.slice(from, to).trim());
      }
    });
  }
  return [...found];
}

/** 수식 하나가 콘텐츠 작성 지침을 어기는 곳을 모두 찾는다. 문제가 없으면 빈 배열. */
export function lintFormula(formula: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const masked = maskStrings(formula);

  for (const call of findFunctionCalls(masked)) {
    if (FORBIDDEN_FUNCTIONS.has(call.name)) {
      issues.push({
        rule: 'UNSUPPORTED_FUNCTION',
        message: `${call.name}은 엔진이 지원하지 않아 문항에 쓸 수 없습니다. 대체 방법으로 출제하세요.`,
      });
    }
    const arg = (index: number): string => {
      const range = call.args[index];
      return range === undefined ? '' : formula.slice(range[0], range[1]);
    };
    if (call.name === 'INDEX' && (literalNumber(arg(1)) === 0 || literalNumber(arg(2)) === 0)) {
      issues.push({
        rule: 'INDEX_ZERO',
        message: 'INDEX의 행·열 번호 0(전체 행·열)은 문항에 쓰지 않습니다. (D-7)',
      });
    }
    if (call.name === 'DATEDIF' && /^\s*"yd"\s*$/i.test(arg(2))) {
      issues.push({
        rule: 'DATEDIF_YD',
        message: 'DATEDIF의 "YD" 단위는 문항에 쓰지 않습니다. (D-14b)',
      });
    }
    if (call.name === 'TEXT') {
      const literal = /^\s*"([\s\S]*)"\s*$/.exec(arg(1));
      if (literal !== null) {
        const format = literal[1] ?? '';
        if (!NUMBER_TEXT_FORMAT.test(format) && !DATE_TEXT_FORMAT.test(format)) {
          issues.push({
            rule: 'TEXT_FORMAT',
            message: `TEXT의 서식 "${format}"은 엔진이 지원하지 않습니다. 숫자·백분율·날짜 서식만 쓰세요.`,
          });
        }
      }
    }
  }

  lintAmpersands(masked, formula, issues);
  return issues;
}

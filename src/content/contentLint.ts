import { KNOWN_UNSUPPORTED_FUNCTIONS } from '@/engine/spreadsheet/supportedFunctions';

/*
 * 콘텐츠 작성 지침 검사 (CARD-03A, docs/CURRICULUM.md 1.3절).
 * 수식 문자열만 보고 판정할 수 있는 규칙을 순수 함수로 구현한다. 튜토리얼 스키마가 정답 수식에 적용하고,
 * 문제 스키마·verify-content(CARD-04E)도 같은 함수를 쓴다.
 *
 * 검사하지 못하는 것(셀 데이터를 계산해야 알 수 있음, 엔진 실행 검증 몫):
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

function lintAmpersands(masked: string, original: string, issues: LintIssue[]): void {
  const walk = (start: number, end: number): void => {
    const parts = splitTopLevel(masked, start, end, '&');
    if (parts.length > 1) {
      for (const [from, to] of parts) {
        if (isRiskyOperand(masked.slice(from, to))) {
          issues.push({
            rule: 'AMPERSAND_DECIMAL',
            message: `& 로 잇는 '${original.slice(from, to).trim()}'은 소수가 될 수 있습니다. ROUND 등으로 먼저 감싸세요. (Excel과 엔진의 소수 표시가 다릅니다, D-9)`,
          });
        }
      }
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

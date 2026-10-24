import type { CellScalar } from '@/engine/spreadsheet/FormulaEngineAdapter';
import {
  addressOf,
  scanReferences,
  type ReferenceToken,
} from '@/engine/spreadsheet/operations/referenceShift';
import type { Perturbation } from '@/types/problem.schema';

/*
 * 학생 입력을 정답 수식과 *구조*로 견준다 (CARD-04B, MASTER_PROMPT §9.1, TEST_STRATEGY Q-02).
 * 통과·실패는 교란 데이터 재계산 결과(PerturbationScorer)가 정한다. 이 파일은 그 결과를 해석하는 데 쓰는
 * 순수 함수(수식 모양 비교, 학생에게 보여 줄 이유 문구)만 모은다. 문제 ID별 분기는 두지 않는다.
 */

/** 셀 내용이 수식이면 true. 상수(숫자·글자·논리값)는 false. */
export function isFormulaContent(content: CellScalar): content is string {
  return typeof content === 'string' && content.trimStart().startsWith('=');
}

export function isEmptyContent(content: CellScalar | undefined): boolean {
  return (
    content === undefined ||
    content === null ||
    (typeof content === 'string' && content.trim() === '')
  );
}

/** 비교용 정규형: 큰따옴표 밖의 공백을 지우고 대문자로. 라벨(PASS/대체 수식) 구분에만 쓴다. */
export function normalizeContent(content: CellScalar): string {
  return String(content)
    .split(/("(?:[^"]|"")*")/)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(/\s+/g, '').toUpperCase()))
    .join('');
}

/** 수식이 호출하는 함수 이름(대문자). 큰따옴표 안 글자는 보지 않는다. */
export function functionNamesOf(formula: string): Set<string> {
  const names = new Set<string>();
  const outsideStrings = formula
    .split(/("(?:[^"]|"")*")/)
    .filter((_, index) => index % 2 === 0)
    .join(' ')
    .toUpperCase();
  for (const match of outsideStrings.matchAll(/([A-Z_][A-Z0-9_.]*)\s*\(/g)) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  return names;
}

const PLACEHOLDER = '§';
const MAX_EXPANDED_CELLS = 20_000;

function bodyOf(formula: string, token: ReferenceToken): string {
  return formula.slice(token.start + token.prefix.length, token.end);
}

/** 참조를 자리표시자로 바꾼 수식 골격. 함수·연산자 모양이 같은지 볼 때 쓴다. */
function skeletonOf(formula: string, tokens: readonly ReferenceToken[]): string {
  let text = formula;
  for (const token of [...tokens].sort((a, b) => b.start - a.start)) {
    text = text.slice(0, token.start) + PLACEHOLDER + text.slice(token.end);
  }
  return normalizeContent(text);
}

/** $를 뺀 참조 목록. 시트 접두가 없으면 수식이 있는 시트로 본다. */
function referenceKeys(
  formula: string,
  tokens: readonly ReferenceToken[],
  sheet: string,
): string[] {
  return tokens.map(
    (token) =>
      `${(token.sheet ?? sheet).toUpperCase()}!${bodyOf(formula, token).replace(/\$/g, '').toUpperCase()}`,
  );
}

/** 참조가 가리키는 셀을 낱개로 펼친다. 열·행 전체 참조나 너무 큰 범위는 null. */
function expandCells(tokens: readonly ReferenceToken[], sheet: string): Set<string> | null {
  const cells = new Set<string>();
  for (const token of tokens) {
    const { first } = token;
    const second = token.second ?? first;
    if (first.col === null || first.row === null || second.col === null || second.row === null) {
      return null;
    }
    const [c1, c2] = [
      Math.min(first.col.index, second.col.index),
      Math.max(first.col.index, second.col.index),
    ];
    const [r1, r2] = [
      Math.min(first.row.index, second.row.index),
      Math.max(first.row.index, second.row.index),
    ];
    if ((c2 - c1 + 1) * (r2 - r1 + 1) + cells.size > MAX_EXPANDED_CELLS) return null;
    for (let row = r1; row <= r2; row += 1) {
      for (let col = c1; col <= c2; col += 1) {
        cells.add(`${(token.sheet ?? sheet).toUpperCase()}!${addressOf(row, col)}`);
      }
    }
  }
  return cells;
}

export interface StructureComparison {
  /** 수식에 셀 참조가 하나라도 있는가 */
  hasReferences: boolean;
  /** 참조를 빼고 본 골격(함수·연산자·상수)이 정답과 같은가 */
  sameShape: boolean;
  /** 골격이 같고 $ 고정 표시만 다른가 */
  absoluteOnlyDifference: boolean;
  /** 골격이 같고 $를 무시해도 가리키는 곳이 다른가(범위 오류 후보) */
  referencesDiffer: boolean;
  /** 정답에는 있는데 학생 수식에 없는 셀. 펼칠 수 없으면 null */
  missingCells: string[] | null;
  /** 학생 수식에만 있는 셀 */
  extraCells: string[] | null;
  /** $가 빠진(또는 다른) 참조 쌍 */
  anchorDifferences: { submitted: string; expected: string }[];
}

function stripSheet(cell: string): string {
  return cell.slice(cell.indexOf('!') + 1);
}

function sortedCells(cells: Iterable<string>): string[] {
  return [...cells].map(stripSheet).sort((a, b) => a.length - b.length || a.localeCompare(b));
}

/** 학생 수식을 기준 정답 수식과 구조로 견준다. 둘 다 '='로 시작하는 수식이어야 한다. */
export function compareStructure(
  submitted: string,
  canonical: string,
  sheet: string,
): StructureComparison {
  const studentTokens = scanReferences(submitted);
  const canonicalTokens = scanReferences(canonical);
  const sameShape = skeletonOf(submitted, studentTokens) === skeletonOf(canonical, canonicalTokens);

  const studentKeys = referenceKeys(submitted, studentTokens, sheet);
  const canonicalKeys = referenceKeys(canonical, canonicalTokens, sheet);
  const sameTargets =
    studentKeys.length === canonicalKeys.length &&
    studentKeys.every((k, i) => k === canonicalKeys[i]);

  const anchorDifferences: StructureComparison['anchorDifferences'] = [];
  if (sameShape && sameTargets) {
    studentTokens.forEach((token, index) => {
      const other = canonicalTokens[index];
      if (other === undefined) return;
      const mine = bodyOf(submitted, token).toUpperCase();
      const theirs = bodyOf(canonical, other).toUpperCase();
      if (mine !== theirs) anchorDifferences.push({ submitted: mine, expected: theirs });
    });
  }

  let missingCells: string[] | null = null;
  let extraCells: string[] | null = null;
  if (sameShape && !sameTargets) {
    const mine = expandCells(studentTokens, sheet);
    const theirs = expandCells(canonicalTokens, sheet);
    if (mine !== null && theirs !== null) {
      missingCells = sortedCells([...theirs].filter((cell) => !mine.has(cell)));
      extraCells = sortedCells([...mine].filter((cell) => !theirs.has(cell)));
    }
  }

  return {
    hasReferences: studentTokens.length > 0,
    sameShape,
    absoluteOnlyDifference: sameShape && sameTargets && anchorDifferences.length > 0,
    referencesDiffer: sameShape && !sameTargets,
    missingCells,
    extraCells,
    anchorDifferences,
  };
}

// ---- 학생에게 보여 줄 이유 (MASTER_PROMPT §9.2: 구체적인 이유, 정답은 그대로 알려 주지 않는다) ----

/** 교란 변형을 학생이 이해할 말로 */
export function describePerturbation(perturbation: Perturbation | null): string {
  if (perturbation === null) return '지금 데이터에서';
  switch (perturbation.kind) {
    case 'ADD_SCALAR':
      return `${perturbation.targetRange}의 숫자에 ${perturbation.value}을(를) 더했을 때`;
    case 'MULTIPLY_SCALAR':
      return `${perturbation.targetRange}의 숫자를 ${perturbation.value}배로 바꿨을 때`;
    case 'INSERT_BLANK_ROW':
      return `${perturbation.targetRange} 사이에 빈 행을 끼워 넣었을 때`;
  }
}

function listCells(cells: readonly string[]): string {
  const shown = cells.slice(0, 5).join(', ');
  return cells.length > 5 ? `${shown} 외 ${cells.length - 5}칸` : shown;
}

export interface ReasonContext {
  cell: string;
  submitted: string;
  /** 오답이 처음 드러난 변형 설명 (describePerturbation) */
  firstFailure: string | null;
  baseMatches: boolean;
  comparison: StructureComparison | null;
}

export const REASONS = {
  pass: () => '정확한 수식으로 해결하셨습니다. 데이터를 바꿔도 결과가 맞습니다.',
  alternate: () =>
    '정답 수식과 모양은 다르지만, 데이터를 바꿔 다시 계산해도 같은 결과가 나오는 올바른 풀이입니다.',
  adviceTextInRange: (cells: readonly string[]) =>
    `다만 범위에 머리글 같은 글자 칸(${listCells(cells)})이 들어 있습니다. COUNTA처럼 글자도 세는 함수에서는 결과가 달라집니다.`,
  adviceWiderRange: (cells: readonly string[]) =>
    `다만 범위가 필요 이상으로 넓습니다(${listCells(cells)}). 이 칸에 값이 생기면 결과가 달라질 수 있습니다.`,
  adviceNarrowerRange: (cells: readonly string[]) =>
    `다만 범위에서 ${listCells(cells)}이(가) 빠져 있습니다. 지금은 비어 있어 결과가 같지만, 값이 채워지면 결과가 달라집니다.`,
  notAttempted: (cell: string) => `${cell} 셀에 아직 아무것도 입력하지 않았습니다.`,
  errorValue: (cell: string, code: string, message: string) =>
    `${cell} 셀의 결과가 오류(${code})입니다. ${message}`,
  hardcoded: (ctx: ReasonContext, isConstant: boolean) => {
    const what = isConstant
      ? `계산된 값(${ctx.submitted})을 직접 입력하셨습니다.`
      : '셀을 가리키지 않고 숫자만으로 수식을 만드셨습니다.';
    const effect = ctx.firstFailure
      ? `${ctx.firstFailure} 정답은 따라서 바뀌어야 하는데 ${ctx.cell} 셀의 값은 그대로입니다.`
      : '표의 값이 바뀌어도 결과가 따라오지 않습니다.';
    const also = ctx.baseMatches ? '' : ' 지금 값도 정답과 다릅니다.';
    return `${what} ${effect}${also} 표의 셀을 참조하는 수식을 쓰세요.`;
  },
  incompleteRange: (ctx: ReasonContext) => {
    const parts: string[] = ['수식의 모양은 맞지만 참조하는 범위가 정답과 다릅니다.'];
    const { missingCells, extraCells } = ctx.comparison ?? { missingCells: null, extraCells: null };
    if (missingCells !== null && missingCells.length > 0)
      parts.push(`빠진 칸: ${listCells(missingCells)}.`);
    if (extraCells !== null && extraCells.length > 0)
      parts.push(`넘치는 칸: ${listCells(extraCells)}.`);
    return parts.join(' ');
  },
  missingAbsoluteRef: (ctx: ReasonContext) => {
    const pairs = (ctx.comparison?.anchorDifferences ?? [])
      .map((d) => `${d.submitted} → ${d.expected}`)
      .join(', ');
    return (
      `${ctx.cell} 셀에서는 값이 맞지만, 이 수식을 다른 셀로 복사하면 고정해야 할 참조가 함께 움직여 값이 달라집니다.` +
      (pairs ? ` 고정이 필요한 참조: ${pairs}.` : '') +
      ' 참조를 선택하고 F4 키로 $를 붙여 고정하세요.'
    );
  },
  dataDependent: (ctx: ReasonContext) =>
    `지금 데이터에서는 맞지만 ${ctx.firstFailure ?? '데이터가 바뀌면'} 결과가 정답과 달라집니다. ` +
    '수식 안에 직접 쓴 숫자나 데이터가 바뀌면 틀어지는 참조가 섞여 있지 않은지 확인하세요.',
  wrongResult: (ctx: ReasonContext) =>
    `${ctx.cell} 셀의 결과가 문제의 목표와 다릅니다. 입력: ${ctx.submitted}. 문제의 조건과 사용할 범위를 다시 확인하세요.`,
  requiredFunctionMissing: (names: readonly string[]) =>
    `결과는 맞지만 이 문제는 ${names.join(', ')} 함수를 직접 사용해 푸는 연습입니다. 해당 함수를 사용해 다시 입력해 보세요.`,
  forbiddenFunctionUsed: (names: readonly string[]) =>
    `이 문제에서는 ${names.join(', ')} 함수를 쓰지 않는 조건입니다. 다른 방법으로 다시 입력해 보세요.`,
} as const;

/*
 * F4 참조 고정 순환 (CARD-02C, TEST_STRATEGY Q-04·Q-06).
 * 수식 편집 중 F4를 누르면 커서가 놓인 셀 참조의 $ 고정을 Excel 순서로 바꾼다.
 *   A1 → $A$1 → A$1 → $A1 → A1
 * 정규식 하나로 찾으면 문자열("A1")이나 시트 이름('A1 시트'!B2) 안의 글자, 함수 이름(LOG10)까지 바뀌므로
 * formulaPreprocess.ts와 같은 방식으로 문자 단위 토큰을 나눠 셀 참조 토큰만 다룬다.
 */

/** Excel 최대 열(XFD)과 행 */
const MAX_COLUMN = 16_384;
const MAX_ROW = 1_048_576;

export interface CellReferenceParts {
  colAbsolute: boolean;
  column: string;
  rowAbsolute: boolean;
  row: number;
}

const REFERENCE = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/;

function columnNumber(letters: string): number {
  return [...letters.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

/** 토큰이 셀 참조(A1, $B$2 등)면 구성 요소, 아니면 null */
export function parseCellReference(token: string): CellReferenceParts | null {
  const match = REFERENCE.exec(token);
  if (!match) {
    return null;
  }
  const [, colMark = '', column = '', rowMark = '', rowText = ''] = match;
  const row = Number(rowText);
  if (columnNumber(column) > MAX_COLUMN || row < 1 || row > MAX_ROW || rowText.startsWith('0')) {
    return null;
  }
  return { colAbsolute: colMark === '$', column, rowAbsolute: rowMark === '$', row };
}

export function formatCellReference(parts: CellReferenceParts): string {
  return `${parts.colAbsolute ? '$' : ''}${parts.column}${parts.rowAbsolute ? '$' : ''}${parts.row}`;
}

/** Excel F4 순서의 다음 고정 상태 */
export function nextReferenceLock(parts: CellReferenceParts): CellReferenceParts {
  const { colAbsolute, rowAbsolute } = parts;
  if (!colAbsolute && !rowAbsolute) return { ...parts, colAbsolute: true, rowAbsolute: true };
  if (colAbsolute && rowAbsolute) return { ...parts, colAbsolute: false, rowAbsolute: true };
  if (!colAbsolute && rowAbsolute) return { ...parts, colAbsolute: true, rowAbsolute: false };
  return { ...parts, colAbsolute: false, rowAbsolute: false };
}

interface Token {
  start: number;
  end: number;
}

function isIdentifierStart(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_' || ch === '$';
}

function isIdentifierPart(ch: string): boolean {
  return isIdentifierStart(ch) || (ch >= '0' && ch <= '9') || ch === '.';
}

/** 따옴표 문자열·시트 이름을 건너뛰며 식별자 토큰(셀 참조 후보)의 위치를 모은다. */
function identifierTokens(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length) {
        if (text.charAt(j) === ch) {
          if (text.charAt(j + 1) === ch) {
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        j += 1;
      }
      i = Math.max(j, i + 1);
    } else if (isIdentifierStart(ch)) {
      let j = i + 1;
      while (j < text.length && isIdentifierPart(text.charAt(j))) {
        j += 1;
      }
      tokens.push({ start: i, end: j });
      i = j;
    } else if (ch >= '0' && ch <= '9') {
      // 숫자로 시작하는 토큰(1E3, 2.5 등)은 참조가 아니다. 이어진 글자까지 한 덩어리로 건너뛴다.
      let j = i + 1;
      while (j < text.length && isIdentifierPart(text.charAt(j))) {
        j += 1;
      }
      i = j;
    } else {
      i += 1;
    }
  }
  return tokens;
}

export interface ToggleResult {
  text: string;
  caret: number;
  /** 바꿀 참조가 없어 그대로면 false */
  changed: boolean;
}

/**
 * 커서(caret, 0부터)가 놓인 셀 참조의 고정 상태를 한 단계 바꾼다. 커서가 참조 바로 뒤에 있어도 그 참조로 본다.
 * 함수 이름(LOG10처럼 참조 모양이지만 뒤에 괄호가 오는 것), 시트 이름(뒤에 '!'), 문자열 안의 글자는 바꾸지 않는다.
 */
export function toggleReferenceAt(text: string, caret: number): ToggleResult {
  for (const { start, end } of identifierTokens(text)) {
    if (caret < start || caret > end) {
      continue;
    }
    const parts = parseCellReference(text.slice(start, end));
    // 뒤에 '('가 오면 함수 이름, '!'가 오면 시트 이름이다.
    const following = text.slice(end).trimStart().charAt(0);
    if (parts === null || following === '(' || following === '!') {
      continue;
    }
    const replacement = formatCellReference(nextReferenceLock(parts));
    return {
      text: text.slice(0, start) + replacement + text.slice(end),
      caret: start + replacement.length,
      changed: true,
    };
  }
  return { text, caret, changed: false };
}

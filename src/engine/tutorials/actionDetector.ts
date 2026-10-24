import { columnLetters } from '@/engine/spreadsheet/operations/referenceShift';
import type { FillDirection } from '@/engine/spreadsheet/operations/autoFill';
import type { TutorialStep } from '@/types/tutorial.schema';

import { notAllowedMessage, violatesAllowedInput } from './tutorialRunner';
import type { TutorialActionEvent } from './tutorialRunner';

/*
 * 사용자 셀 조작 감지기 (CARD-03B, MASTER_PROMPT §7.1).
 * 그리드·입력줄이 실제 조작을 마친 뒤 알리는 사실(GridUserAction)을 러너가 판정할 수 있는
 * TutorialActionEvent로 바꾼다. React에 의존하지 않는 순수 함수라서 단위 테스트로 검증한다.
 *
 * - 한글 조합 중(composing)에 온 조작은 러너에 보내지 않는다. 조합이 끝나 확정된 입력만 전달된다.
 * - 단계 정답은 여기서 알지 못한다. 판정은 러너의 judgeAction이 한다(정답 하드코딩 없음).
 */

/** 그리드 좌표(0부터). 화면 표기(A1)는 이 파일에서 만든다. */
export interface GridPos {
  row: number;
  col: number;
}

export interface GridRangeRef {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface ActionBase {
  /** 한글 등 조합 입력 중인지. true면 러너로 보내지 않는다. */
  composing: boolean;
}

export type GridUserAction = ActionBase &
  (
    | { type: 'selectionChanged'; sheet: string; range: GridRangeRef }
    | {
        type: 'cellCommitted';
        sheet: string;
        row: number;
        col: number;
        /** 사용자가 입력한 원문 */
        input: string;
        /** 반영 뒤 엔진이 계산한 결과 */
        computedValue: string | number | boolean | null;
      }
    | { type: 'keyPressed'; key: string }
    | { type: 'filled'; sheet: string; range: GridRangeRef }
    | { type: 'pointModeEnded'; sheet: string; range: GridRangeRef }
    | { type: 'uiClicked'; element: string }
  );

export const cellRef = ({ row, col }: GridPos): string => `${columnLetters(col)}${row + 1}`;

export function rangeRef(range: GridRangeRef): string {
  const from = cellRef({ row: range.startRow, col: range.startCol });
  const to = cellRef({ row: range.endRow, col: range.endCol });
  return from === to ? from : `${from}:${to}`;
}

/** 채우기가 끝난 뒤 값이 들어 있는 범위(원본 + 늘어난 부분) */
export function filledRange(
  source: GridRangeRef,
  direction: FillDirection,
  count: number,
): GridRangeRef {
  switch (direction) {
    case 'down':
      return { ...source, endRow: source.endRow + count };
    case 'up':
      return { ...source, startRow: Math.max(0, source.startRow - count) };
    case 'right':
      return { ...source, endCol: source.endCol + count };
    case 'left':
      return { ...source, startCol: Math.max(0, source.startCol - count) };
  }
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock']);

/**
 * 키 입력을 단계 정의의 표기('F2', 'Ctrl+D', 'Ctrl+Shift+Z')로 바꾼다.
 * 수정 키만 눌렀거나, 수정 키 없이 글자를 입력한 것은 단축키가 아니므로 null이다(타이핑이 시도 횟수로 세어지지 않게).
 */
export function normalizeKey(event: {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  const command = event.ctrlKey || event.metaKey || event.altKey;
  const printable = [...event.key].length === 1;
  if (printable && !command) return null;
  const name = printable ? event.key.toUpperCase() : event.key === ' ' ? 'Space' : event.key;
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  parts.push(name);
  return parts.join('+');
}

function parseInput(input: string): string | number | boolean {
  const text = input.trim();
  if (text !== '' && Number.isFinite(Number(text))) return Number(text);
  if (/^true$/i.test(text)) return true;
  if (/^false$/i.test(text)) return false;
  return input;
}

/** 조작 하나를 러너 이벤트로 바꾼다. 보내지 않을 조작이면 null. */
export function detectTutorialAction(action: GridUserAction): TutorialActionEvent | null {
  if (action.composing) return null;
  switch (action.type) {
    case 'selectionChanged': {
      const { range } = action;
      const single = range.startRow === range.endRow && range.startCol === range.endCol;
      return single
        ? {
            type: 'SELECT_CELL',
            sheetName: action.sheet,
            cell: cellRef({ row: range.startRow, col: range.startCol }),
          }
        : { type: 'SELECT_RANGE', sheetName: action.sheet, range: rangeRef(range) };
    }
    case 'pointModeEnded':
      return { type: 'SELECT_RANGE', sheetName: action.sheet, range: rangeRef(action.range) };
    case 'cellCommitted': {
      const cell = cellRef(action);
      return action.input.trim().startsWith('=')
        ? {
            type: 'ENTER_FORMULA',
            sheetName: action.sheet,
            cell,
            formula: action.input,
            computedValue: action.computedValue,
          }
        : {
            type: 'ENTER_VALUE',
            sheetName: action.sheet,
            cell,
            value: parseInput(action.input),
          };
    }
    case 'keyPressed':
      return { type: 'PRESS_KEY', key: action.key };
    case 'filled':
      return { type: 'AUTOFILL_RANGE', sheetName: action.sheet, range: rangeRef(action.range) };
    case 'uiClicked':
      return { type: 'CLICK_UI', element: action.element };
  }
}

/**
 * 러너에 보낼지 정한다. 셀 이동·범위 선택·단축키는 지금 단계가 기다리는 종류일 때만 보낸다.
 * (자유롭게 돌아다니는 동작이 틀린 시도로 세어져 힌트가 저절로 열리는 것을 막는다.)
 * 값 입력·채우기·UI 클릭은 종류가 달라도 보내서 러너가 틀린 시도로 기록한다.
 */
export function shouldForwardToRunner(step: TutorialStep, event: TutorialActionEvent): boolean {
  if (event.type === 'SELECT_CELL' || event.type === 'SELECT_RANGE' || event.type === 'PRESS_KEY') {
    return step.expectedAction.type === event.type;
  }
  return true;
}

/**
 * 허용 입력 밖의 조작이면 화면에서 막을 때 보여 줄 안내 문장, 아니면 null (R-07.06).
 * 판정 기준은 러너의 violatesAllowedInput과 같다.
 */
export function guardMessage(step: TutorialStep, action: GridUserAction): string | null {
  const event = detectTutorialAction({ ...action, composing: false });
  if (event === null) return null;
  return violatesAllowedInput(step, event) ? notAllowedMessage(step) : null;
}

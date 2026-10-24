import { ENGINE_LIMITS } from '../FormulaEngineAdapter';

import { shiftFormulaForCopy, type CellRect, type SheetBounds } from './referenceShift';
import type { CellWrite } from './clipboard';

/*
 * 자동 채우기 (CARD-02E, R-08.10, TEST_STRATEGY Q-04).
 * 채우기 핸들로 끈 방향의 줄마다(아래·위로 끌면 열마다, 오른쪽·왼쪽이면 행마다) 원본 칸을 보고 이어질 값을 만든다.
 *
 * 줄의 원본 칸이 모두 같은 종류일 때 (Excel 기본 채우기 동작):
 *   - 숫자: 한 칸이면 같은 값 복사, 두 칸 이상이면 선형 추세(최소제곱)로 이어 간다. 1, 3 → 5, 7
 *   - 날짜(엔진이 날짜로 읽는 입력 형식 YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY): 한 칸이면 하루씩,
 *     두 칸 이상이고 같은 날짜(일)이면서 개월 간격이 일정하면 개월 단위, 그 밖에는 일 간격 추세.
 *   - 끝에 숫자가 붙은 글자(항목1, Q01): 숫자 부분만 이어 간다. 자릿수(앞의 0)는 유지한다.
 *   - 요일·월 이름 목록(월, 화 / 월요일 / 1월 / Mon / Monday / Jan / January): 목록 순서대로 돌아간다.
 * 그 밖의 경우(글자, 섞인 종류, 수식)는 원본 칸을 차례대로 되풀이한다. 수식은 원본 셀에서 떨어진 만큼 상대 참조를 옮긴다.
 * Excel 실측이 필요한 세부(앞 숫자 글자, 개월 판정, 한국어 목록)는 docs/EXCEL_DIFFERENCES.md 확인 목록에 있다.
 */

export type FillDirection = 'down' | 'up' | 'right' | 'left';

const ENGINE_BOUNDS: SheetBounds = {
  maxRows: ENGINE_LIMITS.maxRows,
  maxColumns: ENGINE_LIMITS.maxColumns,
};

// ---- 값 종류 ----

/** 엔진이 숫자로 읽는 단순 숫자 표기(부호, 소수, 지수). 쉼표·통화 기호가 붙은 글자는 숫자로 보지 않는다. */
function parsePlainNumber(raw: string): number | null {
  const text = raw.trim();
  if (text === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** 유효 숫자 15자리로 맞춘 숫자 글자(0.1 + 0.2 같은 부동소수 오차를 Excel 표시처럼 없앤다) */
function formatNumber(value: number): string {
  const rounded = Number(value.toPrecision(15));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

type DateStyle = 'ymd-dash' | 'ymd-slash' | 'mdy-slash';

interface ParsedDate {
  year: number;
  month: number; // 1~12
  day: number;
  style: DateStyle;
  /** 원문의 월·일 자릿수 (2024-3-5처럼 한 자리면 그대로 쓴다) */
  padded: boolean;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseDate(raw: string): ParsedDate | null {
  const text = raw.trim();
  let match = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(text);
  let year: number, month: number, day: number, style: DateStyle, monthText: string;
  if (match) {
    const [, y = '', separator = '', m = '', d = ''] = match;
    year = Number(y);
    month = Number(m);
    day = Number(d);
    style = separator === '-' ? 'ymd-dash' : 'ymd-slash';
    monthText = m;
  } else {
    match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (!match) return null;
    const [, m = '', d = '', y = ''] = match;
    year = Number(y);
    month = Number(m);
    day = Number(d);
    style = 'mdy-slash';
    monthText = m;
  }
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day, style, padded: monthText.length === 2 };
}

const dayNumber = (date: { year: number; month: number; day: number }) =>
  Date.UTC(date.year, date.month - 1, date.day) / 86_400_000;

function formatDate(time: number, like: ParsedDate): string {
  const date = new Date(time * 86_400_000);
  const year = String(date.getUTCFullYear());
  const pad = (n: number) => (like.padded ? String(n).padStart(2, '0') : String(n));
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  switch (like.style) {
    case 'ymd-dash':
      return `${year}-${month}-${day}`;
    case 'ymd-slash':
      return `${year}/${month}/${day}`;
    case 'mdy-slash':
      return `${month}/${day}/${year}`;
  }
}

/** 끝에 숫자가 붙은 글자 (항목1 → 항목, 1). 숫자만 있는 글자는 아니다. */
function parseNumberedText(raw: string): { prefix: string; number: number; digits: number } | null {
  let split = raw.length;
  while (split > 0 && /\d/.test(raw.charAt(split - 1))) split -= 1;
  if (split === raw.length || split === 0) return null;
  const digits = raw.slice(split);
  return { prefix: raw.slice(0, split), number: Number(digits), digits: digits.length };
}

/** 요일·월 목록. 대소문자는 원본 첫 칸 모양을 따른다. */
const BUILT_IN_LISTS: readonly (readonly string[])[] = [
  ['일', '월', '화', '수', '목', '금', '토'],
  ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
];

function findList(
  values: readonly string[],
): { list: readonly string[]; indexes: number[] } | null {
  for (const list of BUILT_IN_LISTS) {
    const lower = list.map((item) => item.toLocaleLowerCase());
    const indexes = values.map((value) => lower.indexOf(value.trim().toLocaleLowerCase()));
    if (indexes.every((index) => index >= 0)) return { list, indexes };
  }
  return null;
}

function matchCase(item: string, like: string): string {
  if (like === like.toLocaleUpperCase() && like !== like.toLocaleLowerCase()) {
    return item.toLocaleUpperCase();
  }
  if (like === like.toLocaleLowerCase() && like !== like.toLocaleUpperCase()) {
    return item.toLocaleLowerCase();
  }
  return item;
}

/** 최소제곱 직선 (위치 0..n-1 → 값) */
function linearTrend(values: readonly number[]): (position: number) => number {
  const n = values.length;
  if (n === 1) return () => values[0] ?? 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, v) => sum + v, 0) / n;
  let numerator = 0;
  let denominator = 0;
  values.forEach((v, x) => {
    numerator += (x - meanX) * (v - meanY);
    denominator += (x - meanX) ** 2;
  });
  const slope = numerator / denominator;
  return (position) => meanY + slope * (position - meanX);
}

/**
 * 한 줄의 원본 값(끄는 방향 순서)을 보고 이어질 값 count개를 만든다.
 * 수식·섞인 종류는 null(호출한 쪽이 원본을 되풀이하며 참조를 옮긴다).
 */
export function continueSeries(values: readonly string[], count: number): string[] | null {
  const n = values.length;
  if (n === 0 || values.some((value) => value.startsWith('='))) return null;
  const positions = Array.from({ length: count }, (_, k) => n + k);

  const numbers = values.map(parsePlainNumber);
  if (numbers.every((value) => value !== null)) {
    const trend = linearTrend(numbers as number[]);
    return positions.map((p) => formatNumber(trend(p)));
  }

  const dates = values.map(parseDate);
  if (dates.every((date) => date !== null)) {
    const parsed = dates as ParsedDate[];
    const first = parsed[0];
    if (first === undefined) return null;
    const monthIndexes = parsed.map((d) => d.year * 12 + (d.month - 1));
    const monthStep = (monthIndexes[1] ?? 0) - (monthIndexes[0] ?? 0);
    const monthly =
      n >= 2 &&
      monthStep !== 0 &&
      parsed.every((d) => d.day === first.day) &&
      monthIndexes.every((m, i) => m - (monthIndexes[0] ?? 0) === i * monthStep);
    if (monthly) {
      return positions.map((p) => {
        const index = (monthIndexes[0] ?? 0) + monthStep * p;
        const year = Math.floor(index / 12);
        const month = (index % 12) + 1;
        const day = Math.min(first.day, daysInMonth(year, month));
        return formatDate(dayNumber({ year, month, day }), first);
      });
    }
    const trend =
      n === 1 ? (p: number) => dayNumber(first) + p : linearTrend(parsed.map(dayNumber));
    return positions.map((p) => formatDate(Math.round(trend(p)), first));
  }

  const listed = findList(values);
  if (listed !== null) {
    const { list, indexes } = listed;
    const start = indexes[0] ?? 0;
    const step = n === 1 ? 1 : (indexes[1] ?? 0) - start;
    const like = values[0] ?? '';
    return positions.map((p) => {
      const index = (((start + step * p) % list.length) + list.length) % list.length;
      return matchCase(list[index] ?? '', like);
    });
  }

  const numbered = values.map(parseNumberedText);
  const firstNumbered = numbered[0];
  if (
    firstNumbered !== null &&
    firstNumbered !== undefined &&
    numbered.every((item) => item !== null && item.prefix === firstNumbered.prefix)
  ) {
    const items = numbered as { prefix: string; number: number; digits: number }[];
    const trend =
      n === 1 ? (p: number) => firstNumbered.number + p : linearTrend(items.map((i) => i.number));
    return positions.map((p) => {
      const next = Math.round(trend(p));
      const digits = String(Math.abs(next)).padStart(firstNumbered.digits, '0');
      return `${firstNumbered.prefix}${next < 0 ? '-' : ''}${digits}`;
    });
  }
  return null;
}

/**
 * 채우기 핸들로 원본 범위(source)를 direction 방향으로 count칸 넓혔을 때 쓸 셀 목록.
 * getRaw는 셀 원문. 시트 밖으로 넘치는 칸은 만들지 않는다.
 */
export function fillWrites(
  getRaw: (row: number, col: number) => string,
  source: CellRect,
  direction: FillDirection,
  count: number,
  bounds: SheetBounds = ENGINE_BOUNDS,
): CellWrite[] {
  const vertical = direction === 'down' || direction === 'up';
  const forward = direction === 'down' || direction === 'right';
  const lines = vertical
    ? { from: source.startCol, to: source.endCol }
    : { from: source.startRow, to: source.endRow };
  const along = vertical
    ? { from: source.startRow, to: source.endRow, limit: bounds.maxRows }
    : { from: source.startCol, to: source.endCol, limit: bounds.maxColumns };
  const length = along.to - along.from + 1;
  const available = forward ? along.limit - 1 - along.to : along.from;
  const steps = Math.max(0, Math.min(count, available));

  const writes: CellWrite[] = [];
  for (let line = lines.from; line <= lines.to; line += 1) {
    // 끄는 방향 순서의 원본 위치 (위·왼쪽으로 끌면 아래·오른쪽 끝부터)
    const sourceIndexes = Array.from({ length }, (_, k) =>
      forward ? along.from + k : along.to - k,
    );
    const at = (index: number) => (vertical ? getRaw(index, line) : getRaw(line, index));
    const series = continueSeries(sourceIndexes.map(at), steps);
    for (let k = 0; k < steps; k += 1) {
      const index = forward ? along.to + 1 + k : along.from - 1 - k;
      const row = vertical ? index : line;
      const col = vertical ? line : index;
      let value: string;
      if (series !== null) {
        value = series[k] ?? '';
      } else {
        const sourceIndex = sourceIndexes[k % length] ?? along.from;
        const raw = at(sourceIndex);
        const offset = index - sourceIndex;
        value = raw.startsWith('=')
          ? shiftFormulaForCopy(raw, vertical ? offset : 0, vertical ? 0 : offset, bounds)
          : raw;
      }
      writes.push({ row, col, value });
    }
  }
  return writes;
}

/**
 * Ctrl+D(아래로 채우기)·Ctrl+R(오른쪽으로 채우기). 선택 범위의 첫 행(열)을 나머지 행(열)에 복사한다.
 * 선택이 한 행(열)이면 바로 위(왼쪽) 셀을 복사한다. 수식은 상대 참조를 옮긴다. 시리즈는 만들지 않는다.
 */
export function copyFillWrites(
  getRaw: (row: number, col: number) => string,
  selection: CellRect,
  direction: 'down' | 'right',
  bounds: SheetBounds = ENGINE_BOUNDS,
): CellWrite[] {
  const down = direction === 'down';
  const single = down
    ? selection.startRow === selection.endRow
    : selection.startCol === selection.endCol;
  const sourceIndex = down
    ? single
      ? selection.startRow - 1
      : selection.startRow
    : single
      ? selection.startCol - 1
      : selection.startCol;
  if (sourceIndex < 0) return [];
  const writes: CellWrite[] = [];
  for (let row = selection.startRow; row <= selection.endRow; row += 1) {
    for (let col = selection.startCol; col <= selection.endCol; col += 1) {
      if ((down ? row : col) === sourceIndex) continue;
      const raw = down ? getRaw(sourceIndex, col) : getRaw(row, sourceIndex);
      const value = raw.startsWith('=')
        ? shiftFormulaForCopy(
            raw,
            down ? row - sourceIndex : 0,
            down ? 0 : col - sourceIndex,
            bounds,
          )
        : raw;
      writes.push({ row, col, value });
    }
  }
  return writes;
}

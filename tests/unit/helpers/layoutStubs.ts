import { afterAll, beforeAll } from 'vitest';

/*
 * jsdom은 레이아웃을 계산하지 않아 가상화 그리드가 셀을 그리지 않는다. 스크롤 영역 크기만 알려 준다
 * (SpreadsheetGrid.test.tsx·FormulaBar.test.tsx와 같은 방식). 실제 레이아웃은 E2E가 검증한다.
 */
const SIZE_STUBS = {
  offsetWidth: 960,
  offsetHeight: 480,
  clientWidth: 960,
  clientHeight: 480,
} as const;

export function installLayoutStubs(): void {
  const saved = new Map<string, PropertyDescriptor | undefined>();
  beforeAll(() => {
    for (const [name, value] of Object.entries(SIZE_STUBS)) {
      saved.set(name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name));
      Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: () => value });
    }
  });
  afterAll(() => {
    for (const [name, descriptor] of saved) {
      if (descriptor === undefined) Reflect.deleteProperty(HTMLElement.prototype, name);
      else Object.defineProperty(HTMLElement.prototype, name, descriptor);
    }
  });
}

export function cellAt(container: HTMLElement, row: number, col: number): HTMLElement {
  const cell = container.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
  if (cell === null) throw new Error(`셀 ${row},${col}이 그려지지 않았습니다`);
  return cell;
}

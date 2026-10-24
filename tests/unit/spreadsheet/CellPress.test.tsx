import { fireEvent, render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { SpreadsheetGrid } from '@/components/spreadsheet/SpreadsheetGrid';

/*
 * CARD-03D 이미 선택된 셀 재클릭 통지 (R-07.05). SpreadsheetGrid.test.tsx와 같은 이유로 크기를 알려 준다.
 * 실제 브라우저에서의 동작은 tutorial-flow.spec.ts가 검증한다.
 */
const SIZE_STUBS = { offsetWidth: 960, offsetHeight: 480, clientWidth: 960, clientHeight: 480 };
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

const cell = (row: number, col: number) => {
  const found = document.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
  if (found === null) throw new Error(`셀 ${row},${col}이 렌더링되지 않았습니다`);
  return found;
};

function setup() {
  const onCellPress = vi.fn();
  const onSelectionChange = vi.fn();
  render(
    <SpreadsheetGrid
      label="테스트 시트"
      rowCount={100}
      colCount={30}
      getCellValue={() => ''}
      onCellsChange={() => undefined}
      onCellPress={onCellPress}
      onSelectionChange={onSelectionChange}
    />,
  );
  return { onCellPress, onSelectionChange };
}

describe('SpreadsheetGrid onCellPress: 이미 선택된 셀 재클릭', () => {
  it('처음 그려질 때는 알리지 않는다', () => {
    const { onCellPress, onSelectionChange } = setup();
    expect(onCellPress).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('이미 선택된 A1을 누르면 onCellPress만 한 번 불린다', () => {
    const { onCellPress, onSelectionChange } = setup();
    fireEvent.mouseDown(cell(0, 0), { button: 0 });
    expect(onCellPress).toHaveBeenCalledTimes(1);
    expect(onCellPress).toHaveBeenCalledWith({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('선택이 바뀌는 클릭은 onSelectionChange만 알리고 onCellPress는 부르지 않는다(이중 통지 없음)', () => {
    const { onCellPress, onSelectionChange } = setup();
    fireEvent.mouseDown(cell(2, 1), { button: 0 });
    fireEvent.mouseUp(window);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onCellPress).not.toHaveBeenCalled();
    // 같은 셀을 다시 누르면 이번에는 재클릭으로 알린다
    fireEvent.mouseDown(cell(2, 1), { button: 0 });
    expect(onCellPress).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it('Shift 클릭은 재클릭이 아니다', () => {
    const { onCellPress } = setup();
    fireEvent.mouseDown(cell(0, 0), { button: 0, shiftKey: true });
    expect(onCellPress).not.toHaveBeenCalled();
  });
});
